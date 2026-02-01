"""Service functions for managing care orders."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from app.models.care_order import CareOrder, OrderStatus
from app.schemas.care_order import CareOrderCreate, CareOrderUpdate
from sqlalchemy.exc import NoResultFound


async def create_care_order(session: AsyncSession, owner_id: int, order_data: CareOrderCreate) -> CareOrder:
    """
    Create a new care order for the given owner.

    :param session: Async database session
    :param owner_id: ID of the owner creating the order
    :param order_data: Data for the new order
    :return: Created CareOrder object
    """
    new_order = CareOrder(
        owner_id=owner_id,
        title=order_data.title,
        description=order_data.description,
        start_date=order_data.start_date,
        end_date=order_data.end_date,
        status=order_data.status,
    )
    session.add(new_order)
    await session.commit()
    await session.refresh(new_order)
    return new_order


async def get_care_order(session: AsyncSession, order_id: int) -> CareOrder:
    """
    Get a care order by its ID.

    :param session: Async database session
    :param order_id: ID of the care order
    :return: CareOrder object if found
    :raises NoResultFound: If no care order with the given ID exists
    """
    result = await session.execute(
        select(CareOrder)
        .options(joinedload(CareOrder.owner))   # <--- здесь
        .where(CareOrder.id == order_id)
    )

    order = result.scalar_one_or_none()
    if order is None:
        raise NoResultFound(f"Care order with id {order_id} not found")
    return order


async def list_care_orders(session: AsyncSession, skip: int = 0, limit: int = 20) -> list[CareOrder]:
    """
    Get a list of care orders with optional pagination.

    :param session: Async database session
    :param skip: Number of records to skip
    :param limit: Maximum number of records to return
    :return: List of CareOrder objects
    """
    result = await session.execute(
        select(CareOrder)
        .options(joinedload(CareOrder.owner))  # <--- здесь
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def update_care_order(session: AsyncSession, order_id: int, order_data: CareOrderUpdate) -> CareOrder:
    """
    Update a care order partially.

    :param session: Async database session
    :param order_id: ID of the care order to update
    :param order_data: Data to update (partial)
    :return: Updated CareOrder object
    :raises NoResultFound: If no care order with the given ID exists
    """
    order = await get_care_order(session, order_id)

    for field, value in order_data.dict(exclude_unset=True).items():
        setattr(order, field, value)

    await session.commit()
    await session.refresh(order)
    return order


async def delete_care_order(session: AsyncSession, order_id: int) -> None:
    """
    Delete a care order by its ID.

    :param session: Async database session
    :param order_id: ID of the care order to delete
    :raises NoResultFound: If no care order with the given ID exists
    """
    order = await get_care_order(session, order_id)
    await session.delete(order)
    await session.commit()
