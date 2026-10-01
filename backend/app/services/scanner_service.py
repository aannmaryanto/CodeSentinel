import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.projects import Project
from app.models.sources import ProjectSource
from app.models.scans import Scan
from app.models.findings import Finding
from app.schemas.scans import ScanResponse, FindingResponse, SeverityCounts
from app.services.scanner.engine import ScanEngine


async def create_scan_record(db: AsyncSession, project_id: uuid.UUID) -> Scan:
    """
    Creates an initial Scan record in pending status.
    """
    scan = Scan(
        project_id=project_id,
        status="pending",
        started_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return scan


async def scan_workspace_directory(
    db: AsyncSession,
    project_id: uuid.UUID,
    workspace_dir: str,
    commit_sha: Optional[str] = None,
    branch: Optional[str] = None,
) -> Scan:
    """
    Executes a static analysis security scan on a target workspace directory.
    Persists Scan and Finding database records with proper transaction handling.
    """
    scan = Scan(
        project_id=project_id,
        status="running",
        commit_sha=commit_sha,
        branch=branch,
        started_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    if not os.path.isdir(workspace_dir):
        scan.status = "failed"
        scan.error_message = "Source workspace directory does not exist or is unreadable."
        scan.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(scan)
        return scan

    try:
        engine = ScanEngine()
        raw_findings = engine.scan_workspace(workspace_dir)

        finding_models: List[Finding] = []
        for rf in raw_findings:
            sev = rf.severity.lower()
            finding_obj = Finding(
                scan_id=scan.id,
                project_id=project_id,
                rule_id=rf.rule_id,
                title=rf.title,
                description=rf.description,
                severity=sev,
                category=rf.category,
                file_path=rf.file_path,
                line_number=rf.line_number,
                code_snippet=rf.code_snippet,
                recommendation=rf.recommendation,
            )
            db.add(finding_obj)
            finding_models.append(finding_obj)

        scan.status = "completed"
        scan.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(scan)
        return scan

    except Exception as e:
        await db.rollback()
        scan.status = "failed"
        scan.error_message = f"Scan failed due to an unexpected error: {str(e)}"
        scan.completed_at = datetime.now(timezone.utc)
        db.add(scan)
        await db.commit()
        await db.refresh(scan)
        return scan


async def run_project_scan(
    db: AsyncSession,
    project: Project,
    source: ProjectSource,
) -> ScanResponse:
    """
    Executes a static analysis security scan on the project's uploaded source workspace.
    Persists findings to the database and updates scan status.
    """
    extracted_path = os.path.join(source.storage_path, "extracted")
    if os.path.isdir(extracted_path):
        workspace_dir = extracted_path
    else:
        workspace_dir = source.storage_path

    scan = await scan_workspace_directory(
        db=db,
        project_id=project.id,
        workspace_dir=workspace_dir,
    )

    # Fetch persisted findings for ScanResponse schema construction
    stmt = select(Finding).where(Finding.scan_id == scan.id)
    res = await db.execute(stmt)
    finding_models = list(res.scalars().all())

    severity_counts = SeverityCounts()
    finding_responses = []
    for fm in finding_models:
        sev = fm.severity.lower()
        if sev == "critical":
            severity_counts.critical += 1
        elif sev == "high":
            severity_counts.high += 1
        elif sev == "medium":
            severity_counts.medium += 1
        elif sev == "low":
            severity_counts.low += 1
        else:
            severity_counts.info += 1
        finding_responses.append(FindingResponse.model_validate(fm))

    return ScanResponse(
        id=scan.id,
        project_id=scan.project_id,
        status=scan.status,
        commit_sha=scan.commit_sha,
        branch=scan.branch,
        error_message=scan.error_message,
        started_at=scan.started_at,
        completed_at=scan.completed_at,
        total_findings=len(finding_responses),
        severity_counts=severity_counts,
        findings=finding_responses,
        created_at=scan.created_at,
        updated_at=scan.updated_at,
    )


async def get_project_scans(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> List[Scan]:
    """
    Retrieves all scan records for a project.
    """
    stmt = select(Scan).where(Scan.project_id == project_id).order_by(Scan.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())
