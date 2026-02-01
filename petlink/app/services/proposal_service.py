"""
Service functions for CRUD operations on Proposal model.
"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.proposal import Proposal, ProposalStatus
from app.schemas.proposal import ProposalCreate, ProposalUpdate
from sqlalchemy.exc import NoResultFound


async def create_proposal(
    session: AsyncSession, proposal_data: ProposalCreate
) -> Proposal:
    """
    Create a new proposal.

    Args:
        session: Async SQLAlchemy session.
        proposal_data: ProposalCreate schema with input data.
    Returns:
        Created Proposal instance.
    """
    new_proposal = Proposal(**proposal_data.dict())
    session.add(new_proposal)
    await session.commit()
    await session.refresh(new_proposal)
    return new_proposal


async def get_proposal(session: AsyncSession, proposal_id: int) -> Proposal:
    """
    Retrieve a proposal by ID.

    Args:
        session: Async SQLAlchemy session.
        proposal_id: ID of the proposal to retrieve.
    Raises:
        NoResultFound: if no proposal found with the given ID.

    Returns:
        Proposal instance.
    """
    result = await session.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.scalars().first()
    if not proposal:
        raise NoResultFound
    return proposal


async def list_proposals(
    session: AsyncSession, skip: int = 0, limit: int = 20
) -> List[Proposal]:
    """
    Retrieve a list of proposals with pagination.

    Args:
        session: Async SQLAlchemy session.
        skip: Number of records to skip.
        limit: Max number of records to return.
    Returns:
        List of Proposal instances.
    """
    result = await session.execute(select(Proposal).offset(skip).limit(limit))
    return result.scalars().all()


async def update_proposal(
    session: AsyncSession, proposal_id: int, proposal_data: ProposalUpdate
) -> Proposal:
    """
    Update an existing proposal partially.

    Args:
        session: Async SQLAlchemy session.
        proposal_id: ID of proposal to update.
        proposal_data: ProposalUpdate schema with data to update.
    Raises:
        NoResultFound: if no proposal found with the given ID.
    Returns:
        Updated Proposal instance.
    """
    proposal = await get_proposal(session, proposal_id)
    for field, value in proposal_data.dict(exclude_unset=True).items():
        setattr(proposal, field, value)
    session.add(proposal)
    await session.commit()
    await session.refresh(proposal)
    return proposal


async def delete_proposal(session: AsyncSession, proposal_id: int) -> None:
    """
    Delete a proposal by ID.

    Args:
        session: Async SQLAlchemy session.
        proposal_id: ID of the proposal to delete.
    Raises:
        NoResultFound: if no proposal found with the given ID.
    """
    proposal = await get_proposal(session, proposal_id)
    await session.delete(proposal)
    await session.commit()
