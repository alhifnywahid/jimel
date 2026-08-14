import { siGithub } from "simple-icons";
import Link from "@/components/router/link";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";

const REPO_URL = "https://github.com/";

export function GitHubRepositoriesMenu() {
  return (
    <Button size="icon" aria-label="Open project repository on GitHub" asChild>
      <Link href={REPO_URL} target="_blank" rel="noreferrer">
        <SimpleIcon icon={siGithub} className="fill-primary-foreground" />
      </Link>
    </Button>
  );
}
