import type { ComponentType } from "react";
import type { ModulePageComponent } from "../../lib-server/nodes/types";
import StaticPage from "./StaticPage";
import InputFormPage from "./InputFormPage";
import Table from "./Table";
import ListView from "./ListView";
import CardPage from "./Card";
import Container from "./Container";
import View from "./View";

// Maps a ModulePage's `component` key (set by the node executor in
// lib/nodes/*.ts) to the React component that actually renders it. Keeping
// this lookup here — rather than in lib/nodes — is what lets the node
// executors stay framework-agnostic: they describe *what* to render, the
// webhook endpoints (server/hooks/[...path].ts, middleware.ts) use this
// registry plus NukeJS's `renderComponent()` to turn that into HTML.
export const WEBHOOK_PAGE_COMPONENTS: Record<ModulePageComponent, ComponentType<any>> = {
    staticPage: StaticPage,
    inputForm: InputFormPage,
    table: Table,
    listView: ListView,
    card: CardPage,
    container: Container,
    view: View,
};