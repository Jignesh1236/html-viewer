import { Buffer } from "buffer";
globalThis.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import { Router, Route, Switch } from "wouter";
import App from "./App";
import SEOPage from "./pages/SEOPage";
import "./index.css";
import { useEditorStore } from "./store/editorStore";

useEditorStore.getState().initFromDb();

createRoot(document.getElementById("root")!).render(
  <Router>
    <Switch>
      <Route path="/seo" component={SEOPage} />
      <Route path="/" component={App} />
      <Route component={App} />
    </Switch>
  </Router>
);
