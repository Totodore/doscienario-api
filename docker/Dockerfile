FROM node:16-alpine as build
#On se met dans la dir /build
WORKDIR /build

#Add packages to build Canvas, Webp and MozJPEG
#On ajoute pleins de packets nécessaires au build de l'application
RUN apk add --no-cache \
    python3 \
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
#On copie tous les fichiers depuis là ou on build vers /build dans l'image
COPY . .
#On install toutes les dépendances
RUN npm install
#On build
RUN npm run build

#Ensuite on part d'une autre image (différente)
FROM node:16-alpine
#On se met dans la dir app
WORKDIR /app
#On copie tout le contenu de /build vers /app
COPY --from=build /build /app

#On installe quelques executables qui seront utilisé par le programme compilé
RUN apk update && \
    apk upgrade -U && \
    apk add ca-certificates ffmpeg && \
	rm -rf /var/cache/*

RUN echo "http://dl-cdn.alpinelinux.org/alpine/v3.3/main" >> /etc/apk/repositories

RUN apk add --no-cache libwebp=0.4.4-r0 libwebp-tools=0.4.4-r0

RUN mkdir /data
RUN mkdir /data/files
RUN mkdir /data/images

#On expose le port 3000 (expose ne veut pas dire totalement ouvert, 
#c'est plutot ouvrir le port mais seulement dans les réseaux internes de docker)
EXPOSE 3000

#On spécifie que la dir /app/data sera un volume
VOLUME [ "/app/data" ]

#On donne une commande qui sera executé lors de la création du container
CMD ["npm", "run", "start:prod"]