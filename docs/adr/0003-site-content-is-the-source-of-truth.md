# The site's content collections are the source of truth

Content lives in the site's own content collections. The planning document that seeded it (`my-data.md`) is not migrated wholesale, is not committed, and is ignored by git.

The document was never version-controlled, so removing it from the working tree would have destroyed the only copy. The owner chose to keep it as a local reference and keep it out of the repository entirely, rather than commit it as an archive. The consequence: the repository has exactly one content source of truth, the site, and the original text exists only on the owner's machine. Anything the information architecture did not carry across is therefore not recoverable from git.
