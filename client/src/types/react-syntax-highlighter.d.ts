declare module "react-syntax-highlighter/dist/esm/prism-light" {
  import { ComponentType } from "react";
  const PrismLight: ComponentType<any> & { registerLanguage: (name: string, lang: any) => void };
  export default PrismLight;
}
declare module "react-syntax-highlighter/dist/esm/languages/prism/python" {
  const lang: any;
  export default lang;
}
declare module "react-syntax-highlighter/dist/esm/languages/prism/matlab" {
  const lang: any;
  export default lang;
}
declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  export const oneDark: any;
}
