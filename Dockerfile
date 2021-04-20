FROM node:12.18-alpine
ENV NODE_ENV=docker
ENV PORT=80
WORKDIR /usr/src/app
COPY ["./package.json", "npm-shrinkwrap.json*", "./"]
RUN yarn install --prod
COPY . .
RUN yarn build
EXPOSE 80
CMD ["yarn", "start"]
