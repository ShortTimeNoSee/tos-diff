import { x as slot, y as bind_props } from "../../chunks/index.js";
function _layout($$payload, $$props) {
  let data = $$props["data"];
  $$payload.out += `<nav><a href="/">Home</a></nav> <!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!---->`;
  bind_props($$props, { data });
}
export {
  _layout as default
};
