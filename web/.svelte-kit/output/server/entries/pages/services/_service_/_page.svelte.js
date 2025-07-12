import { A as ensure_array_like, y as bind_props, w as pop, u as push } from "../../../../chunks/index.js";
import { e as escape_html } from "../../../../chunks/escaping.js";
function html(value) {
  var html2 = String(value ?? "");
  var open = "<!---->";
  return open + html2 + "<!---->";
}
async function load({ params, fetch }) {
  const svc = params.service.toLowerCase();
  const res = await fetch(`/data/${svc}/changes.json`);
  if (res.status === 404) {
    return { status: 404, error: new Error("Service not found") };
  }
  const changes = await res.json();
  return { props: { service: params.service, changes } };
}
function _page($$payload, $$props) {
  push();
  let service = $$props["service"];
  let changes = $$props["changes"];
  $$payload.out += `<h1>${escape_html(service)} ToS Changes</h1> `;
  if (changes.length === 0) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<p>No changes detected yet.</p>`;
  } else {
    $$payload.out += "<!--[!-->";
    const each_array = ensure_array_like(changes);
    $$payload.out += `<!--[-->`;
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let change = each_array[$$index];
      $$payload.out += `<section><h2>${escape_html(new Date(change.timestamp).toLocaleString())}</h2> <div class="summary">${html(change.summary.join(""))}</div> <details><summary>View full diff</summary> <div class="diff">${html(change.diffHtml)}</div></details></section>`;
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { service, changes });
  pop();
}
export {
  _page as default,
  load
};
