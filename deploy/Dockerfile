# noon prototyping platform (Cloud Run behind IAP): static Vite build served by nginx on $PORT.
FROM nginx:1.27-alpine
ENV PORT=8080
# the nginx image renders /etc/nginx/templates/*.template with envsubst at start (→ conf.d/default.conf)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY dist/ /usr/share/nginx/html/
