FROM node:12
WORKDIR /app
RUN apt-get update
COPY . .
RUN yarn
CMD [ "node","index.js" ]
EXPOSE 8080