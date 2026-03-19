import type { ProcessingRule } from "./common.js";

export function applyProcessingRules(entry: string, rules: ProcessingRule[]): string {
  let result = entry;
  for (const rule of rules) {
    switch (rule.type) {
      case "prefix":
        result = rule.value + result;
        break;
      case "suffix":
        result = result + rule.value;
        break;
      case "urlencode":
        result = encodeURIComponent(result);
        break;
      case "base64encode":
        result = btoa(result);
        break;
      case "base64decode":
        try { result = atob(result); } catch { /* skip invalid */ }
        break;
      case "replace":
        try {
          if (rule.regex) {
            result = result.replace(new RegExp(rule.match, "g"), rule.replace);
          } else {
            result = result.split(rule.match).join(rule.replace);
          }
        } catch { /* skip invalid regex */ }
        break;
      case "uppercase":
        result = result.toUpperCase();
        break;
      case "lowercase":
        result = result.toLowerCase();
        break;
      case "reverse":
        result = [...result].reverse().join("");
        break;
    }
  }
  return result;
}
