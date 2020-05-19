FROM node:latest
RUN mkdir -p /usr/src/cvs-tsk-edh-dispatcher
WORKDIR /usr/src/cvs-tsk-edh-dispatcher

# Copy source & tests
COPY src /usr/src/cvs-tsk-edh-dispatcher/src
COPY tests/resources /usr/src/cvs-tsk-edh-dispatcher/tests/resources

# Copy configuration & npm files
COPY tsconfig.json /usr/src/cvs-tsk-edh-dispatcher
COPY .eslintrc /usr/src/cvs-tsk-edh-dispatcher
COPY serverless.yml /usr/src/cvs-tsk-edh-dispatcher
COPY src/config /usr/src/cvs-tsk-edh-dispatcher/.build/src/config
COPY package.json /usr/src/cvs-tsk-edh-dispatcher
COPY package-lock.json /usr/src/cvs-tsk-edh-dispatcher

# Install dependencies
RUN npm install

## Script from the web to wait for SQS to start up
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait

## Run the wait script until SQS is up
CMD /wait && npm start
