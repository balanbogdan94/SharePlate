#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

backup="${RUNNER_TEMP:?}/shareplate-backend-rollback"
site=(--resource-group "${AZURE_RESOURCE_GROUP:?}" --name "${AZURE_WEBAPP_NAME:?}")
settings_query="[?name=='Telemetry__Enabled' || name=='ApplicationInsightsAgent_EXTENSION_VERSION' || name=='APPINSIGHTS_JAVASCRIPT_ENABLED']"

snapshot() {
  mkdir -p "$backup"
  az webapp show "${site[@]}" \
    --query '{state:state,scmHost:enabledHostNames[?contains(@, `.scm.`)] | [0]}' \
    --output json > "$backup/site.json"
  jq -e '(.state == "Running" or .state == "Stopped") and (.scmHost | type == "string" and length > 0)' \
    "$backup/site.json" > /dev/null
  az webapp config appsettings list "${site[@]}" \
    --query "$settings_query" --output json > "$backup/settings.json"

  local scm_host token
  scm_host=$(jq -r '.scmHost' "$backup/site.json")
  if [[ ! "$scm_host" =~ ^[a-zA-Z0-9.-]+$ ]]; then
    echo "::error::Invalid App Service SCM hostname."
    return 1
  fi
  token=$(az account get-access-token --resource https://management.azure.com/ --query accessToken --output tsv)
  if [[ -z "$token" ]]; then
    echo "::error::An Azure access token is required to snapshot the deployed package."
    return 1
  fi
  if [[ "${GITHUB_ACTIONS:-false}" == "true" ]]; then
    echo "::add-mask::$token"
  fi
  curl --fail --silent --show-error --retry 2 --max-time 180 \
    --header "Authorization: Bearer $token" \
    "https://$scm_host/api/zip/site/wwwroot/" --output "$backup/package.zip"
  unzip -tq "$backup/package.zip" > /dev/null
  unzip -Z1 "$backup/package.zip" | grep -Fx 'SharePlate.API.dll' > /dev/null
  echo "Previous API package and telemetry settings are available for rollback."
}

rollback() {
  if [[ ! -s "$backup/package.zip" || ! -f "$backup/settings.json" || ! -f "$backup/site.json" ]]; then
    echo "::error::A complete deployment snapshot is required for rollback."
    return 1
  fi
  local state
  state=$(jq -r '.state' "$backup/site.json")
  if [[ "$state" != "Running" && "$state" != "Stopped" ]]; then
    echo "::error::The previous App Service state is invalid."
    return 1
  fi

  # Keep the API stopped until both its previous binaries and settings have been restored.
  az webapp stop "${site[@]}" --output none
  az webapp deploy "${site[@]}" --src-path "$backup/package.zip" --type zip \
    --clean true --restart false --async false --track-status false --output none
  if [[ "$(jq 'length' "$backup/settings.json")" -gt 0 ]]; then
    az webapp config appsettings set "${site[@]}" --settings "@$backup/settings.json" --output none
  fi
  local missing=()
  while IFS= read -r name; do
    missing+=("$name")
  done < <(jq -r \
    '["Telemetry__Enabled", "ApplicationInsightsAgent_EXTENSION_VERSION", "APPINSIGHTS_JAVASCRIPT_ENABLED"] - [.[].name] | .[]' \
    "$backup/settings.json")
  if [[ "${#missing[@]}" -gt 0 ]]; then
    az webapp config appsettings delete "${site[@]}" --setting-names "${missing[@]}" --output none
  fi
  if [[ "$state" == "Running" ]]; then
    az webapp start "${site[@]}" --output none
  fi
  echo "The previous API package, telemetry settings and app state were restored."
}

case "${1:-}" in
  snapshot)
    trap 'echo "::error::Deployment snapshot failed. No telemetry configuration was changed." >&2; exit 1' ERR
    snapshot
    ;;
  rollback)
    trap 'echo "::error::Rollback failed. Inspect the deployment before restarting or changing telemetry settings." >&2; exit 1' ERR
    rollback
    ;;
  cleanup)
    rm -f "$backup/package.zip" "$backup/settings.json" "$backup/site.json"
    ;;
  *)
    echo "::error::Expected snapshot, rollback or cleanup."
    exit 1
    ;;
esac
