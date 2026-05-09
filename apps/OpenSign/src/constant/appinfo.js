import logo from "../assets/images/logo.png";
import { getEnv } from "./Utils";

export function serverUrl_fn() {
  const env = getEnv();
  const serverurl = env?.REACT_APP_SERVERURL
    ? env.REACT_APP_SERVERURL // env.REACT_APP_SERVERURL is used for prod
    : process.env.REACT_APP_SERVERURL; //  process.env.REACT_APP_SERVERURL is used for dev (locally)
  let baseUrl = serverurl ? serverurl : window.location.origin + "/api/app";
  return baseUrl;
}
export const appInfo = {
  applogo: logo,
  appId: process.env.REACT_APP_APPID ? process.env.REACT_APP_APPID : "opensign",
  baseUrl: serverUrl_fn(),
  defaultRole: "contracts_User",
  fev_Icon: "data:image/png;base64,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",
  googleClientId: process.env.REACT_APP_GOOGLECLIENTID
    ? `${process.env.REACT_APP_GOOGLECLIENTID}`
    : "",
  metaDescription:
    "Secure electronic signatures for documents that need clean execution.",
  settings: [
    {
      role: "contracts_Admin",
      menuId: "VPh91h0ZHk",
      pageType: "dashboard",
      pageId: "35KBoSgoAK",
      extended_class: "contracts_Users"
    },
    {
      role: "contracts_OrgAdmin",
      menuId: "VPh91h0ZHk",
      pageType: "dashboard",
      pageId: "35KBoSgoAK",
      extended_class: "contracts_Users"
    },
    {
      role: "contracts_Editor",
      menuId: "H9vRfEYKhT",
      pageType: "dashboard",
      pageId: "35KBoSgoAK",
      extended_class: "contracts_Users"
    },
    {
      role: "contracts_User",
      menuId: "H9vRfEYKhT",
      pageType: "dashboard",
      pageId: "35KBoSgoAK",
      extended_class: "contracts_Users"
    }
  ]
};
