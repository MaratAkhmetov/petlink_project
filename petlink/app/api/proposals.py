"""API routes for managing proposals."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import NoResultFound

from app.db.database import get_db_session
from app.schemas.proposal import (
    ProposalCreate,
    ProposalRead,
    ProposalUpdate,
)
from app.services.proposal_service import (
    create_proposal,
    get_proposal,
    list_proposals,
    update_proposal,
    delete_proposal,
)
from app.api.auth import get_current_user  # your auth dependency
from app.models.user import User

router = APIRouter(prefix="/proposals", tags=["Proposals"])


@router.post("/", response_model=ProposalRead, status_code=status.HTTP_201_CREATED)
async def create_new_proposal(
    proposal_data: ProposalCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new proposal.

    The petsitter must be the current authenticated user.
    """
    if proposal_data.petsitter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Petsitter ID does not match current user",
        )
    new_proposal = await create_proposal(session, proposal_data)
    return new_proposal


@router.get("/{proposal_id}", response_model=ProposalRead)
async def read_proposal(
    proposal_id: int,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Retrieve a proposal by ID.
    """
    try:
        proposal = await get_proposal(session, proposal_id)
    except NoResultFound:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal


@router.get("/", response_model=list[ProposalRead])
async def read_proposals(
    skip: int = 0,
    limit: int = 20,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Retrieve a paginated list of proposals.
    """
    proposals = await list_proposals(session, skip=skip, limit=limit)
    return proposals


@router.patch("/{proposal_id}", response_model=ProposalRead)
async def update_existing_proposal(
    proposal_id: int,
    proposal_data: ProposalUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Partially update a proposal.

    Only the petsitter who created the proposal can update it.
    """
    try:
        proposal = await get_proposal(session, proposal_id)
    except NoResultFound:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.petsitter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this proposal")

    updated_proposal = await update_proposal(session, proposal_id, proposal_data)
    return updated_proposal


@router.delete("/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_proposal(
    proposal_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a proposal by ID.

    Only the petsitter who created the proposal can delete it.
    """
    try:
        proposal = await get_proposal(session, proposal_id)
    except NoResultFound:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.petsitter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this proposal")

    await delete_proposal(session, proposal_id)
    return
