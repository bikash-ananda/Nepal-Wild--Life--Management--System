# Experimental only: pinned dh-fwd source with empty-Info firmware compatibility.
# This image is not part of production Compose and must not replace wildlife-dh-tunnel.
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git
WORKDIR /src
RUN git init  && git remote add origin https://github.com/undervolter/dh-fwd.git  && git fetch --depth 1 origin c26ce4f4b7051bfd0b8d07d8a22400f52cb5142c  && git checkout --detach FETCH_HEAD

COPY patches/empty-info-no-salt.patch /tmp/empty-info-no-salt.patch
RUN git apply /tmp/empty-info-no-salt.patch
RUN go test ./...
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/dh-fwd .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates socat  && addgroup -S camera  && adduser -S -D -H -G camera camera
COPY --from=builder /out/dh-fwd /usr/local/bin/dh-fwd
COPY entrypoint.sh /entrypoint.sh
RUN chmod 0555 /entrypoint.sh  && chmod 0555 /usr/local/bin/dh-fwd
USER camera
EXPOSE 8554/tcp
ENTRYPOINT ["/entrypoint.sh"]
