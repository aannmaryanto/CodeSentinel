import os
import shutil
import uuid
import hashlib
import zipfile
import tarfile
from typing import Optional, List, Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.models.sources import ProjectSource
from app.models.projects import Project

ALLOWED_EXTENSIONS = {".zip", ".tar.gz", ".tgz", ".tar"}


def is_safe_extraction_path(target_directory: str, dest_file_path: str) -> bool:
    """
    Prevents path traversal by verifying that dest_file_path resolves strictly
    within target_directory.
    """
    target_abs = os.path.abspath(target_directory)
    dest_abs = os.path.abspath(dest_file_path)
    return os.path.commonpath([target_abs, dest_abs]) == target_abs


def validate_file_extension(filename: str) -> str:
    """
    Validates supported archive file extensions (.zip, .tar.gz, .tgz, .tar).
    """
    lower_filename = filename.lower()
    for ext in ALLOWED_EXTENSIONS:
        if lower_filename.endswith(ext):
            return ext
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported file type. Supported extensions are: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
    )


async def save_and_extract_source(
    db: AsyncSession,
    project: Project,
    upload_file: UploadFile,
) -> ProjectSource:
    """
    Validates, saves, and safely extracts uploaded source code archives into an isolated workspace.
    """
    filename = upload_file.filename or "source.zip"
    ext = validate_file_extension(filename)

    # Read uploaded content into memory/buffer
    contents = await upload_file.read()
    file_size = len(contents)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    # Compute SHA256 checksum
    checksum = hashlib.sha256(contents).hexdigest()

    # Generate source UUID
    source_id = uuid.uuid4()
    base_dir = os.path.abspath(settings.UPLOAD_STORAGE_DIR)
    source_dir = os.path.join(base_dir, str(project.id), str(source_id))
    extracted_dir = os.path.join(source_dir, "extracted")
    archive_path = os.path.join(source_dir, f"source_archive{ext}")

    os.makedirs(extracted_dir, exist_ok=True)

    # Write archive to disk
    with open(archive_path, "wb") as f:
        f.write(contents)

    uncompressed_size = 0
    file_count = 0

    try:
        if ext == ".zip":
            with zipfile.ZipFile(archive_path, "r") as zip_ref:
                for member in zip_ref.infolist():
                    # Check for path traversal in member name
                    if member.filename.startswith("/") or ".." in member.filename:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Path traversal vulnerability detected in zip entry: {member.filename}",
                        )

                    dest_path = os.path.join(extracted_dir, member.filename)
                    if not is_safe_extraction_path(extracted_dir, dest_path):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Malicious archive entry detected outside workspace: {member.filename}",
                        )

                    if not member.is_dir():
                        uncompressed_size += member.file_size
                        file_count += 1

                        if uncompressed_size > settings.MAX_UNCOMPRESSED_SIZE_BYTES:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Archive uncompressed size exceeds maximum allowed limit.",
                            )

                        if file_count > settings.MAX_SOURCE_FILES_COUNT:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Archive contains too many files (limit: {settings.MAX_SOURCE_FILES_COUNT}).",
                            )

                        # Extract single safe file
                        zip_ref.extract(member, extracted_dir)

        elif ext in {".tar.gz", ".tgz", ".tar"}:
            mode = "r:gz" if ext in {".tar.gz", ".tgz"} else "r:"
            with tarfile.open(archive_path, mode) as tar_ref:
                for member in tar_ref.getmembers():
                    if member.name.startswith("/") or ".." in member.name:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Path traversal vulnerability detected in tar entry: {member.name}",
                        )

                    dest_path = os.path.join(extracted_dir, member.name)
                    if not is_safe_extraction_path(extracted_dir, dest_path):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Malicious archive entry detected outside workspace: {member.name}",
                        )

                    if member.isfile():
                        uncompressed_size += member.size
                        file_count += 1

                        if uncompressed_size > settings.MAX_UNCOMPRESSED_SIZE_BYTES:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Archive uncompressed size exceeds maximum allowed limit.",
                            )

                        if file_count > settings.MAX_SOURCE_FILES_COUNT:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Archive contains too many files (limit: {settings.MAX_SOURCE_FILES_COUNT}).",
                            )

                        tar_ref.extract(member, extracted_dir, filter="data" if hasattr(tarfile, "data_filter") else None)

    except HTTPException:
        shutil.rmtree(source_dir, ignore_errors=True)
        raise
    except Exception as e:
        shutil.rmtree(source_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to extract source archive: {str(e)}",
        )

    # Create DB entity
    source = ProjectSource(
        id=source_id,
        project_id=project.id,
        source_type="archive",
        file_name=filename,
        file_size_bytes=file_size,
        checksum_sha256=checksum,
        storage_path=source_dir,
        file_count=file_count,
        uncompressed_size_bytes=uncompressed_size,
        status="ready",
    )

    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


async def get_latest_project_source(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> Optional[ProjectSource]:
    """
    Fetches the most recent ready source for a project.
    """
    stmt = (
        select(ProjectSource)
        .where(ProjectSource.project_id == project_id)
        .order_by(ProjectSource.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().first()
