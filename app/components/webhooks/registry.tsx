import type { ComponentType } from "react";
import type { WorkflowPageComponent } from "../../../lib/steps/types";
import StaticPage from "./StaticPage";
import InputFormPage from "./InputFormPage";
import Table from "./Table";
import Container from "./Container";
import View from "./View";

// Maps a WorkflowPage's `component` key (set by the step executor in
// lib/steps/*.ts) to the React component that actually renders it. Keeping
// this lookup here — rather than in lib/steps — is what lets the step
// executors stay framework-agnostic: they describe *what* to render, the
// webhook endpoints (server/hooks/[...path].ts, middleware.ts) use this
// registry plus NukeJS's `renderComponent()` to turn that into HTML.
export const WEBHOOK_PAGE_COMPONENTS: Record<WorkflowPageComponent, ComponentType<any>> = {
    staticPage: StaticPage,
    inputForm: InputFormPage,
    table: Table,
    container: Container,
    view: View,
};