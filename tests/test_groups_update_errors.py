import pytest
from app import app as flask_app
from routes import groups as groups_routes


class DummyUser:
    def __init__(self, user_id="creator123"):
        self.id = user_id
        self.is_authenticated = True

    def update_groups(self, group_id, action):
        pass


class DummyGroupModel:
    @staticmethod
    def find_by_id(group_id):
        if group_id == "missing-group":
            return None
        return {"_id": group_id, "created_by": "creator123"}


class DummyItemModel:
    @staticmethod
    def find_by_id(item_id):
        if item_id == "missing-item":
            return None
        # Always belongs to group "real-group"
        return {"_id": item_id, "group_id": "real-group", "name": "Old", "description": "Old desc"}


def test_update_item_item_not_found(monkeypatch):
    """update_item should return 404 when the item does not exist."""
    monkeypatch.setattr(groups_routes, "Item", DummyItemModel)
    monkeypatch.setattr(groups_routes, "Group", DummyGroupModel)
    monkeypatch.setattr(groups_routes, "current_user", DummyUser("creator123"))

    with flask_app.test_request_context(
        "/groups/real-group/items/missing-item",
        method="PUT",
        json={"name": "New Name", "description": "New desc"},
    ):
        resp, status = groups_routes.update_item.__wrapped__("real-group", "missing-item")

    assert status == 404
    assert "Item not found" in resp.get_json()["error"]


def test_update_item_wrong_group(monkeypatch):
    """update_item should return 400 if the item belongs to a different group."""
    monkeypatch.setattr(groups_routes, "Item", DummyItemModel)
    monkeypatch.setattr(groups_routes, "Group", DummyGroupModel)
    monkeypatch.setattr(groups_routes, "current_user", DummyUser("creator123"))

    # Item thinks it belongs to "real-group", but we pass "other-group"
    with flask_app.test_request_context(
        "/groups/other-group/items/i1",
        method="PUT",
        json={"name": "New Name", "description": "New desc"},
    ):
        resp, status = groups_routes.update_item.__wrapped__("other-group", "i1")

    assert status == 400
    assert "Item does not belong to this group" in resp.get_json()["error"]


def test_get_group_not_found(monkeypatch):
    """get_group should return 404 when the group does not exist."""
    monkeypatch.setattr(groups_routes, "Group", DummyGroupModel)
    # Anonymous user for this route
    class DummyAnon:
        is_authenticated = False
    monkeypatch.setattr(groups_routes, "current_user", DummyAnon)

    with flask_app.test_request_context("/groups/missing-group"):
        resp, status = groups_routes.get_group("missing-group")

    assert status == 404
    assert "Group not found" in resp.get_json()["error"]
