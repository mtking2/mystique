---
name: role
description: Alias for the mystique skill — shapeshift Claude into a role ("form"). Use when the user types /role (switch, stack, clear, list, show, create, edit a form), asks to "become a <role>", "switch roles", "stack a role", or "act as a <role>". Identical to /mystique.
user_invocable: true
argument-hint: "<form-name> | +<form-name> | clear | list | show | create | edit <form-name>"
---

# role (alias for mystique)

`/role` is an alias for `/mystique`. The canonical command surface lives in the **mystique** skill (same plugin) — do not duplicate its logic here.

Invoke the `mystique` skill now and follow its dispatch instructions for the arguments the user passed to `/role`. Treat the arguments identically (e.g. `/role security-reviewer` == `/mystique security-reviewer`, `/role +rails-expert` == stack, bare `/role` == list + show).
