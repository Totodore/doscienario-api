import { Injectable, OnModuleInit } from "@nestjs/common";
import { Octokit,  } from "@octokit/core";
import { AppLogger } from "src/utils/app-logger.util";

@Injectable()
export class GithubService implements OnModuleInit {
  
  private readonly octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  constructor(
    private readonly logger: AppLogger,
  ) { }
  
  public async onModuleInit() {
    this.logger.log("Verifying github connection...");
    try {
      await this.octokit.auth();   
    } catch (e) {
      this.logger.error("Failed to connect to github");
      throw e;
    }
  }

  public async openIssue(content: string, user: string, clientLog: string) {
    try {
      const issue = await this.octokit.request('POST /repos/{owner}/{repo}/issues', {
        owner: 'totodore',
        repo: 'doscienario',
        title: `Automatic client issue from user: ${user} ${content.split(" ").slice(0, 5).join(" ")}...`,
        body: content + "\n\n# Client Logs \n```" + clientLog + "\n```\n\n# Server Logs\n```" + await this.logger.getServerLogs() + "\n```",	
      });
      await this.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/assignees', {
        owner: 'totodore',
        repo: 'doscienario',
        issue_number: issue.data.number,
        assignees: ['Totodore']
      });
      // Add bug label to issue
      await this.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner: 'totodore',
        repo: 'doscienario',
        issue_number: issue.data.number,
        labels: ['bug']
      });
      this.logger.log(`Issue opened on for user: ${user}`);
    } catch (e) {
      this.logger.error("Failed to open github issue");
    }
  }

  public async getRelease(platform: "windows" | "linux", version: string): Promise<Release> {
    const releases = await this.octokit.request('GET /repos/{owner}/{repo}/releases', {
      owner: 'totodore',
      repo: 'doscienario',
    });
    const release = releases.data.find(r => r.tag_name === `v${version}`);
    if (!release) {
      throw new Error("Release not found");
    }
    console.log(version, release);
    const assets = release.assets.find(a => platform == "windows" ? a.name.endsWith(".msi") : a.name.endsWith(".deb"));
    if (!assets) {
      throw new Error("Asset not found");
    }
    return {
      name: assets.name,
      notes: release.body_text || release.body,
      platform,
      url: assets.browser_download_url,
      version,
      pub_date: release.published_at,
    };
  }
}

export type Release = {
  version: string;
  url: string;
  platform: "windows" | "linux";
  name: string;
  notes: string;
  pub_date: string;
}