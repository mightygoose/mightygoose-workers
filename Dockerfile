FROM node:14

ENV WORKDIR /app

#install mon
RUN mkdir /tmp/mon && cd /tmp/mon && curl -L# https://github.com/tj/mon/archive/master.tar.gz | tar zx --strip 1 && make install && rm -rf /tmp/mon

#install mongroup
RUN mkdir /tmp/mongroup && cd /tmp/mongroup && curl -L# https://github.com/jgallen23/mongroup/archive/master.tar.gz | tar zx --strip 1 && make install && rm -rf /tmp/mongroup

WORKDIR ${WORKDIR}
COPY package.json /app
RUN npm install
COPY . .
RUN npm run postinstall

ENTRYPOINT ["./entrypoint.sh"]

