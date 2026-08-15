import type { ModuleNodeType } from "../models/Module";
import type { NodeExecutor } from "./types";
import webhookNode from "./webhook";
import inputFormNode from "./inputForm";
import httpRequestNode from "./httpRequest";
import conditionNode from "./condition";
import staticPageNode from "./staticPage";
import saveRecordNode from "./saveRecord";
import saveToListNode from "./saveToList";
import mapperNode from "./mapper";
import functionNode from "./function";
import callNode from "./call";
import routeNode from "./route";
import forwardNode from "./forward";
import findOneNode from "./findOne";
import tableNode from "./table";
import listViewNode from "./listView";
import cardNode from "./card";
import containerNode from "./container";
import queryNode from "./query";
import setCookieNode from "./setCookie";
import getCookieNode from "./getCookie";
import getHeaderNode from "./getHeader";
import setHeaderNode from "./setHeader";
import jwtVerifyNode from "./jwtVerify";
import jwtSignNode from "./jwtSign";
import menuNode from "./menu";
import tabsNode from "./tabs";
import navbarNode from "./navbar";
import footerNode from "./footer";
import viewNode from "./view";
import gapNode from "./gap";
import jsonNode from "./json";
import htmlNode from "./html";
import cssNode from "./css";
import stateNode from "./state";
import labelNode from "./label";
import linkNode from "./link";
import divNode from "./div";
import classNode from "./class";
import textInputNode from "./textInput";
import checkboxInputNode from "./checkboxInput";
import textareaInputNode from "./textareaInput";
import numberInputNode from "./numberInput";
import findNode from "./find";
import matchNode from "./match";
import projectNode from "./project";
import sortNode from "./sort";
import limitNode from "./limit";
import skipNode from "./skip";
import listNode from "./list";
import countNode from "./count";
import distinctNode from "./distinct";
import delayNode from "./delay";
import randomNode from "./random";
import envNode from "./env";
import textNode from "./text";
import imageNode from "./image";
import selectInputNode from "./selectInput";

// ─── Adding a new node ──────────────────────────────────────────────────
// 1. Create `app/lib-server/nodes/<name>.ts` exporting a NodeExecutor (copy an
//    existing one as a template — see webhook.ts or staticPage.ts).
// 2. Import it above and add it to NODE_EXECUTORS below.
// 3. Editor-side, add the matching `app/lib/node-defs/<name>.ts` — see that
//    folder's index.ts for the same pattern.
// moduleEngine.ts itself never needs to change.

export const NODE_EXECUTORS: Record<ModuleNodeType, NodeExecutor> = {
    webhook: webhookNode,
    inputForm: inputFormNode,
    httpRequest: httpRequestNode,
    condition: conditionNode,
    staticPage: staticPageNode,
    saveRecord: saveRecordNode,
    saveToList: saveToListNode,
    mapper: mapperNode,
    function: functionNode,
    call: callNode,
    route: routeNode,
    forward: forwardNode,
    findOne: findOneNode,
    table: tableNode,
    listView: listViewNode,
    card: cardNode,
    container: containerNode,
    query: queryNode,
    setCookie: setCookieNode,
    getCookie: getCookieNode,
    getHeader: getHeaderNode,
    setHeader: setHeaderNode,
    jwtVerify: jwtVerifyNode,
    jwtSign: jwtSignNode,
    menu: menuNode,
    tabs: tabsNode,
    navbar: navbarNode,
    footer: footerNode,
    view: viewNode,
    gap: gapNode,
    json: jsonNode,
    html: htmlNode,
    css: cssNode,
    state: stateNode,
    label: labelNode,
    link: linkNode,
    div: divNode,
    class: classNode,
    textInput: textInputNode,
    checkboxInput: checkboxInputNode,
    textareaInput: textareaInputNode,
    numberInput: numberInputNode,
    find: findNode,
    match: matchNode,
    project: projectNode,
    sort: sortNode,
    limit: limitNode,
    skip: skipNode,
    list: listNode,
    count: countNode,
    distinct: distinctNode,
    delay: delayNode,
    random: randomNode,
    env: envNode,
    text: textNode,
    image: imageNode,
    selectInput: selectInputNode,
};

export * from "./types";