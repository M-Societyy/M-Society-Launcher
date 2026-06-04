import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { v4 as uuidv4 } from 'uuid';

export interface Account {
  id: string;
  type: 'offline' | 'microsoft';
  username: string;
  uuid: string;
  accessToken: string;
  refreshToken?: string;
  skinUrl?: string;
  active: boolean;
  lastUsed: number;
}

export class AccountManager {
  private accountsFile: string;
  private accounts: Account[] = [];

  constructor(gameDir: string) {
    this.accountsFile = path.join(gameDir, 'accounts.json');
    this.loadAccounts();
  }

  private loadAccounts() {
    try {
      if (fs.existsSync(this.accountsFile)) {
        const data = fs.readFileSync(this.accountsFile, 'utf8');
        this.accounts = JSON.parse(data);
      }
    } catch {
      this.accounts = [];
    }
  }

  private saveAccounts() {
    const dir = path.dirname(this.accountsFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.accountsFile, JSON.stringify(this.accounts, null, 2));
  }

  getAccounts(): Account[] {
    return this.accounts;
  }

  getActiveAccount(): Account | null {
    return this.accounts.find(a => a.active) || null;
  }

  addOfflineAccount(username: string): Account {
    if (!username || username.length < 3 || username.length > 16) {
      throw new Error('Username must be between 3 and 16 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    const existing = this.accounts.find(a => a.username === username && a.type === 'offline');
    if (existing) throw new Error('Account with this username already exists');

    const account: Account = {
      id: uuidv4(),
      type: 'offline',
      username,
      uuid: this.generateOfflineUUID(username),
      accessToken: '0',
      active: this.accounts.length === 0,
      lastUsed: Date.now(),
    };

    this.accounts.push(account);
    this.saveAccounts();
    return account;
  }

  async addMicrosoftAccount(): Promise<Account> {
    try {
      const clientId = '00000000402b5328'; 
      
      const deviceCodeResponse = await this.postRequest(
        'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode',
        `client_id=${clientId}&scope=XboxLive.signin%20offline_access`
      );
      const deviceCode = JSON.parse(deviceCodeResponse);
      
      console.log(`Please visit: ${deviceCode.verification_uri}`);
      console.log(`And enter code: ${deviceCode.user_code}`);

      const tokenResponse = await this.pollForToken(clientId, deviceCode.device_code, deviceCode.interval || 5);
      const tokenData = JSON.parse(tokenResponse);

      const xblResponse = await this.postJson('https://user.auth.xboxlive.com/user/authenticate', {
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: `d=${tokenData.access_token}`,
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
      });
      const xblData = JSON.parse(xblResponse);

      const xstsResponse = await this.postJson('https://xsts.auth.xboxlive.com/xsts/authorize', {
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xblData.Token],
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT',
      });
      const xstsData = JSON.parse(xstsResponse);

      const userHash = xstsData.DisplayClaims.xui[0].uhs;
      const mcResponse = await this.postJson('https://api.minecraftservices.com/authentication/login_with_xbox', {
        identityToken: `XBL3.0 x=${userHash};${xstsData.Token}`,
      });
      const mcData = JSON.parse(mcResponse);

      const profileResponse = await this.authenticatedGet(
        'https://api.minecraftservices.com/minecraft/profile',
        mcData.access_token
      );
      const profile = JSON.parse(profileResponse);

      const account: Account = {
        id: uuidv4(),
        type: 'microsoft',
        username: profile.name,
        uuid: profile.id,
        accessToken: mcData.access_token,
        refreshToken: tokenData.refresh_token,
        skinUrl: profile.skins?.[0]?.url,
        active: this.accounts.length === 0,
        lastUsed: Date.now(),
      };

      this.accounts = this.accounts.filter(a => !(a.type === 'microsoft' && a.uuid === account.uuid));
      this.accounts.push(account);
      this.saveAccounts();
      return account;
    } catch (error: any) {
      throw new Error(`Microsoft login failed: ${error.message}`);
    }
  }

  removeAccount(id: string): boolean {
    const index = this.accounts.findIndex(a => a.id === id);
    if (index === -1) return false;
    
    const wasActive = this.accounts[index].active;
    this.accounts.splice(index, 1);
    
    if (wasActive && this.accounts.length > 0) {
      this.accounts[0].active = true;
    }
    
    this.saveAccounts();
    return true;
  }

  setActiveAccount(id: string): Account | null {
    const account = this.accounts.find(a => a.id === id);
    if (!account) return null;
    
    this.accounts.forEach(a => a.active = false);
    account.active = true;
    account.lastUsed = Date.now();
    this.saveAccounts();
    return account;
  }

  private generateOfflineUUID(username: string): string {
    const md5Input = `OfflinePlayer:${username}`;
    let hash = 0;
    for (let i = 0; i < md5Input.length; i++) {
      const char = md5Input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(32, '0').substring(0, 32);
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
  }

  private postRequest(url: string, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  private postJson(url: string, body: any): Promise<string> {
    const bodyStr = JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          'Accept': 'application/json',
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });
  }

  private authenticatedGet(url: string, token: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.end();
    });
  }

  private async pollForToken(clientId: string, deviceCode: string, interval: number): Promise<string> {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, interval * 1000));
      try {
        const response = await this.postRequest(
          'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
          `grant_type=urn:ietf:params:oauth:grant-type:device_code&client_id=${clientId}&device_code=${deviceCode}`
        );
        const data = JSON.parse(response);
        if (data.access_token) return response;
        if (data.error && data.error !== 'authorization_pending') {
          throw new Error(data.error_description || data.error);
        }
      } catch (e: any) {
        if (e.message && !e.message.includes('authorization_pending')) throw e;
      }
    }
    throw new Error('Authentication timed out');
  }
}
