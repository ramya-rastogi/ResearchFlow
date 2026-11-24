from langgraph.graph import END
from backend.agents import route_after_critic

def test_routing_score_above_threshold_ends():
    state = {
        "trust_score": 92,
        "iteration": 0
    }
    assert route_after_critic(state) == END

def test_routing_score_below_threshold_revises():
    state = {
        "trust_score": 75,
        "iteration": 0
    }
    assert route_after_critic(state) == "revise"

def test_routing_max_revisions_reached_ends_without_force_pass():
    state = {
        "trust_score": 65,
        "iteration": 2  # default MAX_REVISIONS is 2
    }
    # It must terminate to END
    assert route_after_critic(state) == END
    # Trust score remains real (65), NOT artificially changed to 91!
    assert state["trust_score"] == 65
