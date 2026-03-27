FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

RUN npx playwright install --with-deps

COPY . .

CMD ["node", "src/actions/run.js"]