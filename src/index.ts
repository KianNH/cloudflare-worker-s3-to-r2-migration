import { AwsClient } from "aws4fetch";

interface Env {
    R2: R2Bucket,
    AWS_ACCESS_KEY_ID: string,
    AWS_SECRET_ACCESS_KEY: string,
    AWS_SERVICE: string,
    AWS_DEFAULT_REGION: string,
    AWS_S3_BUCKET: string
    AWS_S3_BUCKET_SCHEME: string
}

function objectNotFound(objectName: string): Response {
    return new Response(`Object ${objectName} not found`, {
        status: 404,
    })
}

export default {
    async fetch(request: Request, env: Env, ctx: EventContext<any, any, any>): Promise<Response> {
        const url = new URL(request.url)
        const objectName = url.pathname.slice(1)

        if (objectName === '') {
            return new Response(`Bad Request`, {
                status: 400
            })
        }

        if (request.method !== 'GET') {
            return new Response(`Method Not Allowed`, {
                status: 405
            })
        }

        const obj = await env.R2.get(objectName);

        if (obj === null) {
            const aws = new AwsClient({
                "accessKeyId": env.AWS_ACCESS_KEY_ID,
                "secretAccessKey": env.AWS_SECRET_ACCESS_KEY,
                "service": env.AWS_SERVICE,
                "region": env.AWS_DEFAULT_REGION
            });

            url.protocol = env.AWS_S3_BUCKET_SCHEME;
            url.hostname = env.AWS_S3_BUCKET;

            const signedRequest = await aws.sign(url);
            const s3Object = await fetch(signedRequest);

            if (s3Object.status === 404) {
                return objectNotFound(objectName)
            }

            const s3Body = s3Object.body.tee();
            ctx.waitUntil(env.R2.put(objectName, s3Body[0], {
                httpMetadata: s3Object.headers
            }))

            return new Response(s3Body[1], s3Object);
        }

        const headers = new Headers()
        obj.writeHttpMetadata(headers)
        headers.set('etag', obj.httpEtag)
        return new Response(obj.body, {
            headers
        });
    }
}