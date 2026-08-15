// Kept as a stable import path for the rest of the app (and to mirror
// lib/models/Module.ts's comment pointing here). The actual per-node
// definitions live in ./nodes — one file per node type — so adding or
// editing a node never means touching this file or the editor.
export * from "./node-defs";
