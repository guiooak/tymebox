"""Generates database.rules.json: `yarn rules`.

The rules repeat the same checks on many paths, so they're written once here.
Edit this file, run it, and commit both.
"""
import json, sys

KEY = "auth.token.email.toLowerCase().replace('.', ',')"
# Access by email only counts for an address the provider has verified (Google
# always does). Otherwise, if another sign-in method were ever enabled, someone
# could register with your address and open what's shared with you.
VERIFIED = "auth.token.email_verified === true"
def mine(key):
    return f"({VERIFIED} && {key} === {KEY})"
OWNER_OLD = "root.child('meetings/' + $id + '/owner').val() === auth.uid"
def owner_new(depth):
    # newData is at `depth` levels below the root; walk up to the post-write root.
    up = ".parent()" * depth
    return f"newData{up}.child('meetings/' + $id + '/owner').val() === auth.uid"
MEMBER_ROLE = f"root.child('meetingAccess/' + $id + '/members/' + {KEY} + '/role').val()"
PUBLIC = "root.child('meetingAccess/' + $id + '/visibility').val() === 'public'"
PUBLIC_ROLE = "root.child('meetingAccess/' + $id + '/publicRole').val()"
CAN_EDIT = (f"auth != null && ({OWNER_OLD} || ({VERIFIED} && {MEMBER_ROLE} === 'contributor')"
            f" || ({PUBLIC} && {PUBLIC_ROLE} === 'contributor'))")
CAN_READ = (f"auth != null && (data.child('owner').val() === auth.uid"
            f" || ({VERIFIED} && root.child('meetingAccess/' + $id + '/members/' + {KEY}).exists()) || {PUBLIC})")

def s(n): return f"newData.isString() && newData.val().length <= {n}"
def field(validate, write=CAN_EDIT):
    return {".write": write, ".validate": validate}

status = "newData.val() === 'draft' || newData.val() === 'active' || newData.val() === 'cancelled' || newData.val() === 'finished'"

meeting = {
    ".read": CAN_READ,
    # Create (as yourself) or delete (as the owner) the whole event.
    ".write": (f"auth != null && ((!data.exists() && newData.child('owner').val() === auth.uid)"
               f" || (data.child('owner').val() === auth.uid && !newData.exists()))"),
    ".validate": "newData.hasChildren(['owner'])",
    "owner": {".validate": "newData.isString() && (!data.exists() || newData.val() === data.val())"},
    "ownerName": field(s(200), f"auth != null && {OWNER_OLD}"),
    "id": {".validate": "newData.val() === $id"},
    "name": field(s(200)),
    "description": field(s(5000)),
    "expectedStartTime": field(s(64)),
    "expectedEndTime": field(s(64)),
    "realStartTime": field(s(64)),
    "realEndTime": field(s(64)),
    "status": field(status),
    "createdAt": {".validate": s(64)},
    "updatedAt": field(s(64)),
    "goals": {
        ".write": CAN_EDIT,
        "$goalId": {
            ".validate": "newData.hasChildren(['id', 'name'])",
            "id": {".validate": "newData.val() === $goalId"},
            "name": {".validate": s(500)},
            "weight": {".validate": "newData.isNumber() && newData.val() > 0 && newData.val() <= 100"},
            "finishedAt": {".validate": s(64)},
            "decisions": {".validate": s(5000)},
            "order": {".validate": "newData.isNumber()"},
            "$other": {".validate": False},
        },
    },
    "sideTopics": {
        ".write": CAN_EDIT,
        "$topicKey": {
            "id": {".validate": s(128)},
            "value": {".validate": s(2000)},
            "goalName": {".validate": s(500)},
            "$other": {".validate": False},
        },
    },
    "$other": {".validate": False},
}

access = {
    # Created with the event, by its owner; deleted with it.
    ".write": (f"auth != null && ((!data.exists() && newData.child('owner').val() === auth.uid && {owner_new(2)})"
               f" || ({OWNER_OLD} && !newData.exists()))"),
    "owner": {
        ".read": "auth != null",
        ".write": f"auth != null && !data.exists() && newData.val() === auth.uid && {owner_new(3)}",
    },
    "visibility": {
        ".read": "auth != null",
        ".write": f"auth != null && {owner_new(3)}",
        ".validate": "newData.val() === 'private' || newData.val() === 'public'",
    },
    "publicRole": {
        ".read": "auth != null",
        ".write": f"auth != null && {owner_new(3)}",
        ".validate": "newData.val() === 'viewer' || newData.val() === 'contributor'",
    },
    "members": {
        ".read": f"auth != null && {OWNER_OLD}",
        ".write": f"auth != null && {owner_new(3)}",
        "$key": {
            # Each person can see their own entry, to know their role.
            ".read": f"auth != null && {mine('$key')}",
            ".validate": "newData.hasChildren(['email', 'role', 'addedAt'])",
            "email": {".validate": s(254)},
            "role": {".validate": "newData.val() === 'viewer' || newData.val() === 'contributor'"},
            "addedAt": {".validate": "newData.isNumber()"},
            "$other": {".validate": False},
        },
    },
    "$other": {".validate": False},
}

requests = {
    ".read": f"auth != null && {OWNER_OLD}",
    "$key": {
        ".read": f"auth != null && {mine('$key')}",
        ".write": (
            # The owner approves or denies (removes) any request.
            f"auth != null && (({OWNER_OLD} && !newData.exists())"
            # The requester cancels their own...
            f" || ({mine('$key')} && !newData.exists())"
            # ...or files it, for an existing event they neither own nor belong to.
            f" || ({mine('$key')} && root.child('meetings/' + $id).exists()"
            f" && root.child('meetings/' + $id + '/owner').val() !== auth.uid"
            f" && !root.child('meetingAccess/' + $id + '/members/' + $key).exists()))"
        ),
        ".validate": "newData.hasChildren(['email', 'requestedAt'])",
        "email": {".validate": "newData.val() === auth.token.email"},
        "name": {".validate": s(200)},
        # Shown to the owner as an <img>: only Google profile pictures, so a
        # request can't make the owner's browser call an arbitrary server.
        "photoURL": {".validate": f"{s(2000)} && (newData.val() === ''"
                                  f" || newData.val().beginsWith('https://lh3.googleusercontent.com/'))"},
        "message": {".validate": s(280)},
        "requestedAt": {".validate": "newData.isNumber()"},
        "$other": {".validate": False},
    },
}

rules = {
    "rules": {
        "meetings": {
            # Listing is only allowed as "my own events".
            ".read": "auth != null && query.orderByChild === 'owner' && query.equalTo === auth.uid",
            ".indexOn": ["owner"],
            "$id": meeting,
        },
        "meetingAccess": {"$id": access},
        "sharedWith": {
            "$emailKey": {
                ".read": f"auth != null && {mine('$emailKey')}",
                "$id": {
                    ".write": (f"auth != null && ({OWNER_OLD} || {owner_new(3)}"
                               f" || ({mine('$emailKey')} && !newData.exists()))"),
                    ".validate": "newData.hasChildren(['addedAt', 'role'])",
                    "addedAt": {".validate": "newData.isNumber()"},
                    "role": {".validate": "newData.val() === 'viewer' || newData.val() === 'contributor'"},
                    "$other": {".validate": False},
                },
            },
        },
        "accessRequests": {"$id": requests},
        "requestsByOwner": {
            "$ownerUid": {
                ".read": "auth != null && auth.uid === $ownerUid",
                "$id": {
                    "$key": {
                        ".write": (f"auth != null && (auth.uid === $ownerUid"
                                   f" || ({mine('$key')} && root.child('meetings/' + $id + '/owner').val() === $ownerUid))"),
                        ".validate": "newData.val() === true",
                    },
                },
            },
        },
        "users": {
            "$uid": {
                ".read": "auth != null && auth.uid === $uid",
                ".write": "auth != null && auth.uid === $uid",
                "currentMeetingId": {".validate": s(128)},
                "settings": {
                    "decisionsAutomaticBehavior": {".validate": "newData.isBoolean()"},
                    "locale": {".validate": "newData.val() === 'en-US' || newData.val() === 'pt-BR'"},
                    "$other": {".validate": False},
                },
                "visited": {"$id": {".validate": "newData.isNumber()"}},
                # Events from before sharing. Only read and removed now, by the
                # one-time move to meetings/$id; drop this once everyone has moved.
                "meetings": {"$meetingId": {".validate": False}},
                "$other": {".validate": False},
            },
        },
    },
}
json.dump(rules, open(sys.argv[1], "w"), indent=2)
open(sys.argv[1], "a").write("\n")
