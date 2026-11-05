FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles-v4.css
COPY app.js /usr/share/nginx/html/app-v4.js
EXPOSE 80
