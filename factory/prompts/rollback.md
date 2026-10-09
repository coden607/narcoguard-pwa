# Roll back the live site

Target: an issue labelled `factory:rollback` (the live check failed and no instant rollback ran).

1. With the Vercel tools, list production deployments for project `prj_VvbCgTu4gRMB0VXPoKnL38ONCz9A`
   (team `team_0EMygx8IhzPBfSPFoKlZv3kQ`). Request a rollback to the newest READY production deployment
   older than the failing one.
2. Confirm https://www.narcoguard.app serves the older deployment (fetch `/help` and check `tel:911`).
3. Remove `factory:rollback`, keep `factory:needs-human`, comment **Factory · rollback** with the deployment ids,
   and escalate (RUN.md step 6). If a revert PR was not opened by the workflow, open one from a
   `factory/revert-<sha>` branch.
