import { A as ensure_array_like } from "../../chunks/index.js";
import { e as escape_html } from "../../chunks/escaping.js";
import "clsx";
const replacements = {
  translate: /* @__PURE__ */ new Map([
    [true, "yes"],
    [false, "no"]
  ])
};
function attr(name, value, is_boolean = false) {
  if (value == null || !value && is_boolean) return "";
  const normalized = name in replacements && replacements[name].get(value) || value;
  const assignment = is_boolean ? "" : `="${escape_html(normalized, true)}"`;
  return ` ${name}${assignment}`;
}
const services = ["google"];
function _page($$payload) {
  const each_array = ensure_array_like(services);
  $$payload.out += `<h1>Terms of Service Tracker</h1> <ul><!--[-->`;
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let svc = each_array[$$index];
    $$payload.out += `<li><a${attr("href", `/services/${svc}`)}>${escape_html(svc)}</a></li>`;
  }
  $$payload.out += `<!--]--></ul>`;
}
export {
  _page as default
};
