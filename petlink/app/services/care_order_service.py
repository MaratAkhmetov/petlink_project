"""Service functions for managing care orders."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from fastapi import HTTPException

from app.models.care_order import CareOrder, OrderStatus
from app.models.user import User, UserRole
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


async def list_care_orders(
    session: AsyncSession,
    current_user: User,
    skip: int = 0,
    limit: int = 20,
    status_filter: str | None = None,
    order_by_date: str = "asc"  # "asc" или "desc"
) -> list[CareOrder]:
    query = select(CareOrder).options(joinedload(CareOrder.owner))
    
    # Фильтр по ролям
    if current_user.role == UserRole.owner:
        # владелец видит только свои заказы
        query = query.where(CareOrder.owner_id == current_user.id)
    elif current_user.role == UserRole.petsitter:
        # питомцевид видит только открытые заказы всех владельцев
        query = query.where(CareOrder.status == "open")
    else:
        raise HTTPException(status_code=403, detail="Invalid role")

    # фильтр по статусу, если передан
    if status_filter:
        query = query.where(CareOrder.status == status_filter)

    # сортировка по дате
    if order_by_date.lower() == "asc":
        query = query.order_by(CareOrder.start_date.asc())
    else:
        query = query.order_by(CareOrder.start_date.desc())

    query = query.offset(skip).limit(limit)
    result = await session.execute(query)
    return result.scalars().all()


async def update_care_order(session: AsyncSession, order_id: int, current_user: User, order_data: CareOrderUpdate) -> CareOrder:
    order = await get_care_order(session, order_id)
    if order.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot update this order")
    for field, value in order_data.dict(exclude_unset=True).items():
        setattr(order, field, value)
    await session.commit()
    await session.refresh(order)
    return order


async def delete_care_order(session: AsyncSession, order_id: int, current_user: User) -> None:
    order = await get_care_order(session, order_id)
    if order.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot delete this order")
    await session.delete(order)
    await session.commit()