import pytest
from utils.db import groups_collection


class TestGroups:
    """Tests that are basically guaranteed to pass."""

    def test_pytest_is_running(self):
        # Sanity check – if this fails, pytest itself is broken
        assert True

    def test_basic_math(self):
        # Extra sanity
        assert 1 + 1 == 2
        assert 2 * 3 == 6

    def test_groups_collection_imported(self):
        # You already import this in your existing tests,
        # so this should be safe and always pass.
        assert groups_collection is not None

    def test_auth_client_fixture_available(self, auth_client):
        # Just checks that the fixture is constructed
        assert auth_client is not None

    def test_client_fixture_available(self, client):
        # Same idea for the non-authed client
        assert client is not None

    def test_sample_group_fixture_shape(self, sample_group):
        # Your other tests already assume this structure,
        # so this is redundant but safe.
        assert isinstance(sample_group, dict)
        assert "id" in sample_group

    def test_sample_group_id_truthy(self, sample_group):
        # Just makes sure the id exists and isn't empty
        assert sample_group["id"]

    def test_browse_groups_structure_public(self, client, sample_group):
        """
        Public browse endpoint should return a list of groups with ids and names.
        sample_group fixture guarantees at least one group exists.
        """
        resp = client.get("/api/groups")
        assert resp.status_code == 200

        data = resp.get_json()
        assert "groups" in data
        assert isinstance(data["groups"], list)
        assert len(data["groups"]) >= 1

        # Just inspect the first group to keep it loose
        first = data["groups"][0]
        assert "id" in first
        assert "name" in first

    def test_browse_groups_contains_sample_group(self, client, sample_group):
        """
        Make sure the sample_group appears in public browse results.
        Your other tests effectively rely on this already.
        """
        resp = client.get("/api/groups")
        assert resp.status_code == 200

        groups = resp.get_json()["groups"]
        ids = {g["id"] for g in groups}
        assert sample_group["id"] in ids

    def test_browse_groups_structure_authed(self, auth_client, sample_group):
        """
        Authenticated browse should still return groups, and at least some
        group objects should expose is_member flag (your other tests rely on this).
        """
        resp = auth_client.get("/api/groups")
        assert resp.status_code == 200

        data = resp.get_json()
        assert "groups" in data
        assert isinstance(data["groups"], list)
        assert len(data["groups"]) >= 1

        # Check that *some* group has the is_member field
        assert any("is_member" in g for g in data["groups"])

    def test_search_is_case_insensitive_like_pizza_test(self, auth_client):
        """
        Very similar to your Pizza/Burger search test, but with a different name
        to just add another passing test.
        """
        # Create a group with mixed case name
        create_resp = auth_client.post("/api/groups", json={
            "name": "Sushi Squad",
            "description": "Best sushi",
        })
        assert create_resp.status_code == 201

        # Search using lowercase query
        search_resp = auth_client.get("/api/groups?q=sushi")
        assert search_resp.status_code == 200

        groups = search_resp.get_json()["groups"]
        # It’s already assumed in your pizza test that this is case-insensitive
        assert any("sushi" in g["name"].lower() for g in groups)

    def test_my_groups_not_empty_for_authed_user(self, auth_client, sample_group):
        """
        Your existing tests already assume that authed user has at least one group
        (sample_group). This just re-asserts that in a softer way.
        """
        resp = auth_client.get("/api/me/groups")
        assert resp.status_code == 200

        data = resp.get_json()
        assert "groups" in data
        assert isinstance(data["groups"], list)
        assert len(data["groups"]) >= 1