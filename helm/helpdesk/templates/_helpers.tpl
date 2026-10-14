{{- define "helpdesk.labels" -}}
app.kubernetes.io/part-of: helpdesk
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{- define "helpdesk.podSecurity" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: false
capabilities:
  drop: ["ALL"]
{{- end }}
