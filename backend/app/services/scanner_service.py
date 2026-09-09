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


async def run_project_scan(
    db: AsyncSession,
    project: Project,
    source: ProjectSource,
) -> ScanResponse:
    """
    Executes a static analysis security scan on the project's uploaded source workspace.
    Persists findings to the database and updates scan status.
    """
    # 1. Create Scan record
    scan = Scan(
        project_id=project.id,
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # 2. Determine source workspace path
    extracted_path = os.path.join(source.storage_path, "extracted")
    if os.path.isdir(extracted_path):
        workspace_dir = extracted_path
    else:
        workspace_dir = source.storage_path

    if not os.path.isdir(workspace_dir):
        scan.status = "failed"
        scan.error_message = "Source workspace directory does not exist or is unreadable."
        scan.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(scan)
        return ScanResponse(
            id=scan.id,
            project_id=scan.project_id,
            status=scan.status,
            error_message=scan.error_message,
            started_at=scan.started_at,
            completed_at=scan.completed_at,
            total_findings=0,
            severity_counts=SeverityCounts(),
            findings=[],
            created_at=scan.created_at,
            updated_at=scan.updated_at,
        )

    # 3. Run Scan Engine
    try:
        engine = ScanEngine()
        raw_findings = engine.scan_workspace(workspace_dir)

        finding_models: List[Finding] = []
        severity_counts = SeverityCounts()

        for rf in raw_findings:
            sev = rf.severity.lower()
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

            finding_obj = Finding(
                scan_id=scan.id,
                project_id=project.id,
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

        # Refresh findings to populate IDs and timestamps
        for fm in finding_models:
            await db.refresh(fm)

        finding_responses = [FindingResponse.model_validate(fm) for fm in finding_models]

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

    except Exception as e:
        scan.status = "failed"
        scan.error_message = f"Scan failed due to an unexpected error: {str(e)}"
        scan.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(scan)
        return ScanResponse(
            id=scan.id,
            project_id=scan.project_id,
            status=scan.status,
            error_message=scan.error_message,
            started_at=scan.started_at,
            completed_at=scan.completed_at,
            total_findings=0,
            severity_counts=SeverityCounts(),
            findings=[],
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
