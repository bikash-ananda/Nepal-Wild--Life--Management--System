# Builds dh-fwd (unofficial Dahua P2P forwarder) from a pinned commit. Review the source before changing the pin.
FROM golang:1.25-alpine AS build
RUN apk add --no-cache git
ARG DH_FWD_COMMIT=c26ce4f4b7051bfd0b8d07d8a22400f52cb5142c
WORKDIR /src
RUN git clone https://github.com/undervolter/dh-fwd.git . \
 && git checkout "$DH_FWD_COMMIT" \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/dh-fwd .

FROM alpine:3.22
RUN apk add --no-cache bash socat ca-certificates && adduser -D -u 10001 p2p
COPY --from=build /out/dh-fwd /usr/local/bin/dh-fwd
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 0555 /usr/local/bin/entrypoint.sh /usr/local/bin/dh-fwd
USER 10001
WORKDIR /tmp
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
