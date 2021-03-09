FROM node:14.15-alpine as build

WORKDIR /build

#Add packages to build Canvas, Webp and MozJPEG
RUN apk add --no-cache \
    python \
    g++ \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
	autoconf \
	automake \
	libtool \
	make \
	gcc \
	nasm

COPY . .

RUN npm install

RUN npm run build

FROM node:14.15-alpine

WORKDIR /app

COPY --from=build /build/dist /app

#Installing webp
RUN apk update && \
    apk upgrade -U && \
    apk add ca-certificates ffmpeg && \
	rm -rf /var/cache/*

RUN echo "http://dl-cdn.alpinelinux.org/alpine/v3.3/main" >> /etc/apk/repositories

RUN apk add --no-cache libwebp=0.4.4-r0 libwebp-tools=0.4.4-r0

RUN mkdir /data
RUN mkdir /data/files
RUN mkdir /data/images

EXPOSE 3000

VOLUME [ "/data" ]

CMD ["npm", "run", "start:prod"]