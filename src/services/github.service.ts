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
        body: content + "\n\n" + clientLog,
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

}