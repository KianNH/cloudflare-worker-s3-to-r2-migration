# A Cloudflare Worker for Progressive S3 to R2 

Blog Post: https://kian.org.uk/progressive-s3-to-cloudflare-r2-migration-using-workers/

This is a Cloudflare Worker that will allow you to progressively migrate files from an S3-compatible object store
to Cloudflare R2.

When a file is requested, it will check if it exists in R2 and return it if it does - if not, it'll fetch it from
your object store and both return that response instantly whilst pushing it into R2 in the background.