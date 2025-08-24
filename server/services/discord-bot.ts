import { Client, GatewayIntentBits, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { IStorage } from '../storage';
import { WebSocketManager } from './websocket-manager';
import { ObjectStorageService } from '../objectStorage';

export class DiscordBot {
  private client: Client;
  private storage: IStorage;
  private wsManager: WebSocketManager;
  private botGuildIds: Set<string> = new Set();

  constructor(storage: IStorage, wsManager: WebSocketManager) {
    this.storage = storage;
    this.wsManager = wsManager;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
      ]
    });
  }

  getBotGuildIds(): string[] {
    return Array.from(this.botGuildIds);
  }

  isReady(): boolean {
    return this.client.isReady();
  }

  async start() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      console.error('❌ DISCORD_BOT_TOKEN is required');
      throw new Error('DISCORD_BOT_TOKEN is required');
    }

    console.log('⚙️ Setting up Discord bot event handlers...');
    // Setup event handlers before login
    this.setupEventHandlers();
    
    console.log('🤖 Logging in to Discord...');
    try {
      await this.client.login(token);
      console.log('✅ Discord bot login successful!');
    } catch (error) {
      console.error('❌ Discord bot login failed:', error);
      throw error;
    }
    
    // Wait for client to be ready before registering commands
    console.log('Waiting for Discord client to be ready...');
    if (this.client.isReady()) {
      console.log('Client already ready, registering commands...');
      await this.registerCommands();
    } else {
      console.log('Client not ready yet, will register commands on ready event');
      // Register commands when ready event fires
      this.client.once('ready', async () => {
        console.log('Ready event fired, registering commands...');
        try {
          await this.registerCommands();
          console.log('Commands registered successfully');
        } catch (error) {
          console.error('Failed to register commands:', error);
        }
      });
    }

    console.log('Discord bot start method completed');
  }

  private async registerCommands() {
    const commands = [
      // Banking commands
      new SlashCommandBuilder()
        .setName('은행')
        .setDescription('은행 관련 기능')
        .addSubcommand(subcommand =>
          subcommand
            .setName('계좌개설')
            .setDescription('새 계좌를 개설합니다')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('잔액')
            .setDescription('잔액을 조회합니다')
            .addUserOption(option =>
              option.setName('사용자')
                .setDescription('조회할 사용자 (관리자만)')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('이체')
            .setDescription('다른 사용자에게 송금합니다')
            .addStringOption(option =>
              option.setName('계좌번호')
                .setDescription('받을 사람의 계좌번호 (3-4자리 숫자)')
                .setRequired(true)
            )
            .addIntegerOption(option =>
              option.setName('금액')
                .setDescription('송금할 금액')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('메모')
                .setDescription('송금 메모')
                .setRequired(false)
            )
        ),

      // Stock commands
      new SlashCommandBuilder()
        .setName('주식')
        .setDescription('주식 거래 기능')
        .addSubcommand(subcommand =>
          subcommand
            .setName('목록')
            .setDescription('상장된 주식 목록을 보여줍니다')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('가격')
            .setDescription('특정 주식의 가격을 조회합니다')
            .addStringOption(option =>
              option.setName('종목코드')
                .setDescription('조회할 종목코드')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('매수')
            .setDescription('주식을 매수합니다')
            .addStringOption(option =>
              option.setName('종목코드')
                .setDescription('매수할 종목코드')
                .setRequired(true)
            )
            .addIntegerOption(option =>
              option.setName('수량')
                .setDescription('매수할 수량')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('매도')
            .setDescription('주식을 매도합니다')
            .addStringOption(option =>
              option.setName('종목코드')
                .setDescription('매도할 종목코드')
                .setRequired(true)
            )
            .addIntegerOption(option =>
              option.setName('수량')
                .setDescription('매도할 수량')
                .setRequired(true)
            )
        ),

      // Admin stock management
      new SlashCommandBuilder()
        .setName('주식관리')
        .setDescription('주식 관리 기능 (관리자 전용)')
        .addSubcommand(subcommand =>
          subcommand
            .setName('생성')
            .setDescription('새 주식을 생성합니다 (관리자 전용)')
            .addStringOption(option =>
              option.setName('종목코드')
                .setDescription('종목코드')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('회사명')
                .setDescription('회사명')
                .setRequired(true)
            )
            .addNumberOption(option =>
              option.setName('초기가격')
                .setDescription('초기 주가')
                .setRequired(true)
            )
            .addAttachmentOption(option =>
              option.setName('로고')
                .setDescription('회사 로고 이미지')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('삭제')
            .setDescription('주식을 삭제합니다 (관리자 전용)')
            .addStringOption(option =>
              option.setName('종목코드')
                .setDescription('삭제할 종목코드')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('가격조정')
            .setDescription('주식 가격을 조정합니다 (관리자 전용)')
            .addStringOption(option =>
              option.setName('종목코드')
                .setDescription('종목코드')
                .setRequired(true)
            )
            .addNumberOption(option =>
              option.setName('새가격')
                .setDescription('새로운 주가')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('거래중지')
            .setDescription('주식 거래를 중지합니다 (관리자 전용)')
            .addStringOption(option =>
              option.setName('종목코드')
                .setDescription('종목코드')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('사유')
                .setDescription('중지 사유')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('거래재개')
            .setDescription('주식 거래를 재개합니다 (관리자 전용)')
            .addStringOption(option =>
              option.setName('종목코드')
                .setDescription('종목코드')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('변동률설정')
            .setDescription('특정 주식의 주가 변동률을 설정합니다 (관리자 전용)')
            .addStringOption(option =>
              option.setName('종목코드')
                .setDescription('변동률을 설정할 종목코드')
                .setRequired(true)
            )
            .addNumberOption(option =>
              option.setName('변동률')
                .setDescription('주가 변동률 (예: 3.0은 ±3%)')
                .setRequired(true)
                .setMinValue(0.1)
                .setMaxValue(10.0)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('수정')
            .setDescription('기존 주식 정보를 수정합니다 (관리자 전용)')
            .addStringOption(option =>
              option.setName('종목코드')
                .setDescription('수정할 종목코드')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('회사명')
                .setDescription('새로운 회사명')
                .setRequired(false)
            )
            .addNumberOption(option =>
              option.setName('변동률')
                .setDescription('새로운 변동률 (예: 3.0은 ±3%)')
                .setRequired(false)
                .setMinValue(0.1)
                .setMaxValue(10.0)
            )
            .addAttachmentOption(option =>
              option.setName('로고')
                .setDescription('새로운 회사 로고 이미지')
                .setRequired(false)
            )
        ),

      // Admin account management
      new SlashCommandBuilder()
        .setName('관리자계좌')
        .setDescription('계좌 관리 기능 (관리자 전용)')
        .addSubcommand(subcommand =>
          subcommand
            .setName('거래중지')
            .setDescription('특정 사용자의 거래를 중지합니다 (관리자 전용)')
            .addUserOption(option =>
              option.setName('사용자')
                .setDescription('거래를 중지할 사용자')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('사유')
                .setDescription('중지 사유')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('거래재개')
            .setDescription('특정 사용자의 거래를 재개합니다 (관리자 전용)')
            .addUserOption(option =>
              option.setName('사용자')
                .setDescription('거래를 재개할 사용자')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('거래내역')
            .setDescription('특정 사용자의 거래내역을 조회합니다 (관리자 전용)')
            .addUserOption(option =>
              option.setName('사용자')
                .setDescription('거래내역을 조회할 사용자')
                .setRequired(true)
            )
            .addIntegerOption(option =>
              option.setName('개수')
                .setDescription('조회할 거래 개수 (기본값: 10개)')
                .setRequired(false)
            )
        ),

      // Chart commands
      new SlashCommandBuilder()
        .setName('차트')
        .setDescription('주식 차트를 보여줍니다')
        .addStringOption(option =>
          option.setName('종목코드')
            .setDescription('조회할 종목코드')
            .setRequired(true)
        ),

      // Tax summary command
      new SlashCommandBuilder()
        .setName('세금집계')
        .setDescription('세금 징수 현황을 조회합니다 (관리자 전용)')
        .addStringOption(option =>
          option.setName('기간')
            .setDescription('집계 기간 선택')
            .setRequired(false)
            .addChoices(
              { name: '이번 달', value: 'current_month' },
              { name: '지난 달', value: 'last_month' },
              { name: '전체', value: 'all_time' }
            )
        ),

      // Factory reset command
      new SlashCommandBuilder()
        .setName('공장초기화')
        .setDescription('모든 사용자 데이터를 초기화합니다 (최고관리자 전용)')
        .addStringOption(option =>
          option.setName('확인')
            .setDescription('"초기화확인"을 입력하세요')
            .setRequired(true)
        ),

      // Simplified auction password generation command
      new SlashCommandBuilder()
        .setName('경매비밀번호생성')
        .setDescription('경매 생성용 비밀번호를 생성합니다 (관리자 전용)'),

      // Auction commands
      new SlashCommandBuilder()
        .setName('경매')
        .setDescription('경매 기능')
        .addSubcommand(subcommand =>
          subcommand
            .setName('목록')
            .setDescription('진행중인 경매 목록을 보여줍니다')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('입찰')
            .setDescription('경매에 입찰합니다')
            .addStringOption(option =>
              option.setName('경매id')
                .setDescription('경매 ID')
                .setRequired(true)
            )
            .addIntegerOption(option =>
              option.setName('금액')
                .setDescription('입찰 금액')
                .setRequired(true)
            )
        ),

      // News analysis
      new SlashCommandBuilder()
        .setName('뉴스분석')
        .setDescription('뉴스를 분석하여 주가에 반영합니다 (관리자 전용)')
        .addStringOption(option =>
          option.setName('제목')
            .setDescription('뉴스 제목')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('내용')
            .setDescription('뉴스 내용')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('종목코드')
            .setDescription('영향받을 종목코드 (선택)')
            .setRequired(false)
        ),

      // Admin management
      new SlashCommandBuilder()
        .setName('관리자설정')
        .setDescription('관리자 권한을 관리합니다 (최고관리자 전용)')
        .addSubcommand(subcommand =>
          subcommand
            .setName('부여')
            .setDescription('특정 사용자에게 관리자 권한을 부여합니다')
            .addUserOption(option =>
              option.setName('사용자')
                .setDescription('관리자 권한을 부여할 사용자')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('제거')
            .setDescription('특정 사용자의 관리자 권한을 제거합니다')
            .addUserOption(option =>
              option.setName('사용자')
                .setDescription('관리자 권한을 제거할 사용자')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('목록')
            .setDescription('현재 관리자 목록을 보여줍니다')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('세율설정')
            .setDescription('세율을 설정합니다 (%)')
            .addNumberOption(option =>
              option.setName('세율')
                .setDescription('설정할 세율 (예: 3.3은 3.3%)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(50)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('계좌삭제')
            .setDescription('특정 사용자의 계좌를 삭제합니다 (최고관리자 전용)')
            .addUserOption(option =>
              option.setName('사용자')
                .setDescription('계좌를 삭제할 사용자')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('확인')
                .setDescription('"삭제확인"을 입력하세요')
                .setRequired(true)
            )
        )
    ];

    if (this.client.application) {
      await this.client.application.commands.set(commands);
      console.log('Slash commands registered');
    }
  }

  private setupEventHandlers() {
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      
      await this.handleCommand(interaction);
    });

    this.client.on('ready', async () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}`);
      
      // 봇 상태를 온라인으로 설정하고 활동 표시
      try {
        await this.client.user?.setPresence({
          status: 'online',
          activities: [{
            name: '🏦 한국은행 종합서비스센터 | 24/7 운영',
            type: 0 // PLAYING
          }]
        });
        console.log('✅ Discord bot status set to ONLINE with activity');
      } catch (error) {
        console.error('❌ Failed to set bot status:', error);
      }
      
      // Wait a moment for Discord to fully initialize
      setTimeout(async () => {
        try {
          // Clear and repopulate guild IDs
          this.botGuildIds.clear();
          
          // Use cache first, then fetch if needed
          let guilds = this.client.guilds.cache;
          
          if (guilds.size === 0) {
            console.log('No guilds in cache, fetching from API...');
            try {
              guilds = await this.client.guilds.fetch() as any;
            } catch (fetchError) {
              console.error('Error fetching guilds from API:', fetchError);
              guilds = this.client.guilds.cache; // Fallback to cache
            }
          }
          
          guilds.forEach((guild) => {
            this.botGuildIds.add(guild.id);
          });
          
          console.log(`Bot is in ${this.botGuildIds.size} guilds:`);
          for (const guildId of Array.from(this.botGuildIds)) {
            try {
              const guild = this.client.guilds.cache.get(guildId);
              if (guild) {
                console.log(`  - ${guild.name} (${guildId})`);
              } else {
                console.log(`  - [Guild not in cache] (${guildId})`);
              }
            } catch (error) {
              console.log(`  - [Error accessing guild] (${guildId})`);
            }
          }
          
          // Make the bot guilds available globally for routes
          (global as any).botGuildIds = this.botGuildIds;
          (global as any).discordBot = this;
          
          console.log('Guild IDs updated and made available globally');
        } catch (error) {
          console.error('Error in ready event:', error);
          // Fallback: at least make the bot instance available
          (global as any).discordBot = this;
        }
      }, 2000); // 2초 대기
    });

    this.client.on('guildCreate', (guild) => {
      console.log(`Bot joined guild: ${guild.name} (${guild.id})`);
      this.botGuildIds.add(guild.id);
      // Update global reference
      (global as any).botGuildIds = this.botGuildIds;
    });

    this.client.on('guildDelete', (guild) => {
      console.log(`Bot left guild: ${guild.name} (${guild.id})`);
      this.botGuildIds.delete(guild.id);
      // Update global reference
      (global as any).botGuildIds = this.botGuildIds;
    });
  }

  private async handleCommand(interaction: ChatInputCommandInteraction) {
    const { commandName, guildId, user } = interaction;
    
    if (!guildId) {
      await interaction.reply('이 명령은 서버에서만 사용할 수 있습니다.');
      return;
    }

    try {
      switch (commandName) {
        case '은행':
          await this.handleBankCommand(interaction, guildId, user.id);
          break;
        case '주식':
          await this.handleStockCommand(interaction, guildId, user.id);
          break;
        case '주식관리':
          await this.handleStockManagementCommand(interaction, guildId, user.id);
          break;
        case '차트':
          await this.handleChartCommand(interaction, guildId);
          break;
        case '경매':
          await this.handleAuctionCommand(interaction, guildId, user.id);
          break;
        case '뉴스분석':
          await this.handleNewsAnalysisCommand(interaction, guildId, user.id);
          break;
        case '관리자설정':
          // Defer reply immediately for admin commands as they involve database operations
          await interaction.deferReply();
          await this.handleAdminManagementCommand(interaction, guildId, user.id);
          break;
        case '관리자계좌':
          await this.handleAdminAccountCommand(interaction, guildId, user.id);
          break;
        case '세금집계':
          await this.handleTaxSummaryCommand(interaction, guildId, user.id);
          break;
        case '공장초기화':
          await this.handleFactoryResetCommand(interaction, guildId, user.id);
          break;
        case '경매비밀번호생성':
          await this.handleSimpleAuctionPasswordCommand(interaction, guildId, user.id);
          break;
        default:
          await interaction.reply('알 수 없는 명령입니다.');
      }
    } catch (error) {
      console.error('Command error:', error);
      // Check if interaction is already replied to avoid 40060 error
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply('명령 처리 중 오류가 발생했습니다.');
        } catch (replyError) {
          console.error('Failed to send error reply:', replyError);
        }
      }
    }
  }

  private async handleBankCommand(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case '계좌개설':
        await this.createAccount(interaction, guildId, userId);
        break;
      case '잔액':
        await this.checkBalance(interaction, guildId, userId);
        break;
      case '이체':
        await this.transferMoney(interaction, guildId, userId);
        break;
    }
  }

  private async createAccount(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    try {
      // First get or create user
      let user = await this.storage.getUserByDiscordId(userId);
      if (!user) {
        const discordUser = await interaction.client.users.fetch(userId);
        user = await this.storage.createUser({
          discordId: userId,
          username: discordUser.username,
          discriminator: discordUser.discriminator || '0000',
          avatar: discordUser.avatar
        });
      }

      // Check if account already exists using database user ID
      const existingAccount = await this.storage.getAccountByUser(guildId, user.id);
      if (existingAccount) {
        await interaction.reply(`🚫 이미 계좌가 개설되어 있습니다.\n계좌번호: ${existingAccount.uniqueCode}\n현재 잔액: ₩${Number(existingAccount.balance).toLocaleString()}`);
        return;
      }

      // Generate unique code (3 digits for public officials, 4 digits for regular citizens)
      const uniqueCode = Math.random() < 0.1 
        ? Math.floor(Math.random() * 900 + 100).toString() // 3 digits (10% chance)
        : Math.floor(Math.random() * 9000 + 1000).toString(); // 4 digits

      const account = await this.storage.createAccount({
        guildId,
        userId: user.id,
        uniqueCode,
        balance: "1000000", // Default 1M won
        frozen: false
      });

      // Add initial deposit transaction
      await this.storage.addTransaction({
        guildId,
        toUserId: user.id,
        type: 'initial_deposit',
        amount: "1000000",
        memo: '계좌 개설 보너스'
      });

      // Get dashboard URL
      const dashboardUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS}` 
        : 'https://bankofkorea.replit.app';

      await interaction.reply(`✅ 계좌가 성공적으로 개설되었습니다!\n계좌번호: ${uniqueCode}\n초기 잔액: ₩1,000,000\n\n📊 **웹 대시보드**: ${dashboardUrl}\n💡 대시보드에서 실시간 거래현황과 포트폴리오를 확인하실 수 있습니다!`);
    } catch (error) {
      await interaction.reply('계좌 개설 중 오류가 발생했습니다.');
    }
  }

  private async checkBalance(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const targetUser = interaction.options.getUser('사용자');
    const queryDiscordId = targetUser ? targetUser.id : userId;

    // Check if querying another user and if user is admin
    if (targetUser && targetUser.id !== userId) {
      const isAdmin = await this.isAdmin(guildId, userId);
      if (!isAdmin) {
        await interaction.reply('다른 사용자의 잔액은 관리자만 조회할 수 있습니다.');
        return;
      }
    }

    try {
      // First get user by Discord ID to get database user ID
      const user = await this.storage.getUserByDiscordId(queryDiscordId);
      if (!user) {
        await interaction.reply('계좌를 찾을 수 없습니다. /은행 계좌개설 명령으로 계좌를 먼저 개설해주세요.');
        return;
      }

      // Now get account using database user ID
      const account = await this.storage.getAccountByUser(guildId, user.id);
      if (!account) {
        await interaction.reply('계좌를 찾을 수 없습니다. /은행 계좌개설 명령으로 계좌를 먼저 개설해주세요.');
        return;
      }

      const balance = Number(account.balance).toLocaleString();
      const displayName = targetUser ? `${targetUser.username}` : '귀하';
      
      await interaction.reply(`💰 ${displayName}의 잔액: ₩${balance}`);
    } catch (error) {
      await interaction.reply('잔액 조회 중 오류가 발생했습니다.');
    }
  }

  private async transferMoney(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const accountNumber = interaction.options.getString('계좌번호', true);
    const amount = interaction.options.getInteger('금액', true);
    const memo = interaction.options.getString('메모') || '';

    if (amount <= 0) {
      await interaction.reply('송금 금액은 0보다 커야 합니다.');
      return;
    }

    try {
      // First get sender user by Discord ID
      const senderUser = await this.storage.getUserByDiscordId(userId);
      if (!senderUser) {
        await interaction.reply('계좌를 찾을 수 없습니다. /은행 계좌개설 명령으로 계좌를 먼저 개설해주세요.');
        return;
      }

      // 계좌번호로 받는사람 찾기
      const targetAccount = await this.storage.getAccountByUniqueCode(guildId, accountNumber);
      if (!targetAccount) {
        await interaction.reply(`❌ 계좌번호 ${accountNumber}를 찾을 수 없습니다.`);
        return;
      }

      // Check if trying to send to own account (using database user IDs)
      if (targetAccount.userId === senderUser.id) {
        await interaction.reply('❌ 자신의 계좌로는 송금할 수 없습니다.');
        return;
      }

      // Get sender account using database user ID
      const fromAccount = await this.storage.getAccountByUser(guildId, senderUser.id);
      if (!fromAccount) {
        await interaction.reply('계좌를 찾을 수 없습니다. /은행 계좌개설 명령으로 계좌를 먼저 개설해주세요.');
        return;
      }

      if (fromAccount.frozen) {
        await interaction.reply('계좌가 동결되어 거래할 수 없습니다.');
        return;
      }

      // Check minimum balance requirement (must have at least 1 won after transfer)
      const currentBalance = Number(fromAccount.balance);
      if (currentBalance - amount < 1) {
        await interaction.reply('송금 후 잔액은 최소 1원 이상이어야 합니다.');
        return;
      }

      // Get target user by database user ID to get their Discord ID
      const targetUser = await this.storage.getUser(targetAccount.userId);
      if (!targetUser) {
        await interaction.reply('받는 사람의 정보를 찾을 수 없습니다.');
        return;
      }

      // Get Discord user info for display
      const targetDiscordUser = await this.client.users.fetch(targetUser.discordId);
      
      // Execute transfer using database user IDs
      await this.storage.transferMoney(guildId, senderUser.id, targetAccount.userId, amount, memo);

      await interaction.reply(`✅ ₩${amount.toLocaleString()}을 ${targetDiscordUser.username}에게 송금했습니다.\n메모: ${memo}`);
      
      this.wsManager.broadcast('transaction_completed', {
        type: 'transfer',
        from: userId,
        to: targetAccount.userId,
        amount,
        memo
      });
    } catch (error: any) {
      await interaction.reply(`송금 실패: ${error.message}`);
    }
  }

  private async handleStockCommand(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case '목록':
        await this.listStocks(interaction, guildId);
        break;
      case '가격':
        await this.getStockPrice(interaction, guildId);
        break;
      case '매수':
        await this.buyStock(interaction, guildId, userId);
        break;
      case '매도':
        await this.sellStock(interaction, guildId, userId);
        break;
    }
  }

  private async listStocks(interaction: ChatInputCommandInteraction, guildId: string) {
    try {
      const stocks = await this.storage.getStocksByGuild(guildId);
      
      if (stocks.length === 0) {
        await interaction.reply('상장된 주식이 없습니다.');
        return;
      }

      let message = '📊 **상장된 주식 목록**\n\n';
      
      for (const stock of stocks.slice(0, 10)) {
        const statusIcon = stock.status === 'active' ? '🟢' : 
                          stock.status === 'halted' ? '🟡' : '🔴';
        const price = Number(stock.price).toLocaleString();
        message += `${statusIcon} **${stock.symbol}** (${stock.name})\n`;
        message += `   가격: ₩${price}\n`;
        message += `   상태: ${this.getStatusText(stock.status || 'active')}\n\n`;
      }

      await interaction.reply(message);
    } catch (error) {
      await interaction.reply('주식 목록 조회 중 오류가 발생했습니다.');
    }
  }

  private async buyStock(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const symbol = interaction.options.getString('종목코드', true).toUpperCase();
    const shares = interaction.options.getInteger('수량', true);

    if (shares <= 0) {
      await interaction.reply('매수 수량은 0보다 커야 합니다.');
      return;
    }

    try {
      const stock = await this.storage.getStockBySymbol(guildId, symbol);
      if (!stock) {
        await interaction.reply('해당 종목을 찾을 수 없습니다.');
        return;
      }

      if (stock.status !== 'active') {
        const reason = stock.status === 'halted' ? '거래가 중지된 종목입니다.' : '상장폐지된 종목입니다.';
        await interaction.reply(`❌ ${reason}`);
        return;
      }

      const account = await this.storage.getAccountByUser(guildId, userId);
      if (!account) {
        await interaction.reply('계좌를 찾을 수 없습니다.');
        return;
      }

      if (account.frozen) {
        await interaction.reply('계좌가 동결되어 거래할 수 없습니다.');
        return;
      }

      if (account.tradingSuspended) {
        await interaction.reply('관리자에 의해 거래가 중지된 계좌입니다.');
        return;
      }

      const totalCost = Number(stock.price) * shares;
      const currentBalance = Number(account.balance);

      if (currentBalance - totalCost < 1) {
        await interaction.reply('잔액이 부족합니다. (거래 후 최소 1원이 남아있어야 합니다)');
        return;
      }

      // Execute trade through trading engine
      const result = await this.storage.executeTrade(guildId, userId, symbol, 'buy', shares, Number(stock.price));
      
      await interaction.reply(`✅ ${shares}주 매수 완료!\n종목: ${stock.name} (${symbol})\n가격: ₩${Number(stock.price).toLocaleString()}\n총액: ₩${totalCost.toLocaleString()}`);
      
      this.wsManager.broadcast('trade_executed', result);
    } catch (error: any) {
      await interaction.reply(`매수 실패: ${error.message}`);
    }
  }

  private async sellStock(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const symbol = interaction.options.getString('종목코드', true).toUpperCase();
    const shares = interaction.options.getInteger('수량', true);

    try {
      const stock = await this.storage.getStockBySymbol(guildId, symbol);
      if (!stock) {
        await interaction.reply('해당 종목을 찾을 수 없습니다.');
        return;
      }

      if (stock.status !== 'active') {
        const reason = stock.status === 'halted' ? '거래가 중지된 종목입니다.' : '상장폐지된 종목입니다.';
        await interaction.reply(`❌ ${reason}`);
        return;
      }

      const holding = await this.storage.getHolding(guildId, userId, symbol);
      if (!holding || holding.shares < shares) {
        await interaction.reply('보유 수량이 부족합니다.');
        return;
      }

      const result = await this.storage.executeTrade(guildId, userId, symbol, 'sell', shares, Number(stock.price));
      
      const totalAmount = Number(stock.price) * shares;
      await interaction.reply(`✅ ${shares}주 매도 완료!\n종목: ${stock.name} (${symbol})\n가격: ₩${Number(stock.price).toLocaleString()}\n총액: ₩${totalAmount.toLocaleString()}`);
      
      this.wsManager.broadcast('trade_executed', result);
    } catch (error: any) {
      await interaction.reply(`매도 실패: ${error.message}`);
    }
  }

  private async handleChartCommand(interaction: ChatInputCommandInteraction, guildId: string) {
    const symbol = interaction.options.getString('종목코드', true).toUpperCase();
    
    try {
      const stock = await this.storage.getStockBySymbol(guildId, symbol);
      if (!stock) {
        await interaction.reply('해당 종목을 찾을 수 없습니다.');
        return;
      }

      const candlestickData = await this.storage.getCandlestickData(guildId, symbol, '1h', 24);
      
      // Generate ASCII candlestick chart
      const chartText = this.generateASCIIChart(candlestickData, stock);
      
      await interaction.reply(`\`\`\`\n${chartText}\n\`\`\``);
    } catch (error) {
      await interaction.reply('차트 생성 중 오류가 발생했습니다.');
    }
  }

  private generateASCIIChart(data: any[], stock: any): string {
    if (data.length === 0) {
      return `📊 **${stock.name} (${stock.symbol})** - 가상 경제 시스템\n\n❌ **차트 데이터 없음**\n\n💡 주식을 매수/매도하거나 시뮬레이션이 실행되면 차트 데이터가 생성됩니다.\n\n🏦 **한국은행 종합 서비스센터**`;
    }

    const prices = data.map(d => Number(d.close));
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const range = maxPrice - minPrice;
    
    let chart = `📊 **${stock.name} (${stock.symbol})** - 가상 경제 시스템\n`;
    chart += `💰 현재가: ₩${Number(stock.price).toLocaleString()}\n`;
    chart += `📈 상태: ${this.getStatusText(stock.status)}\n\n`;
    chart += `🎮 **가상 주식 차트** (ASCII)\n`;
    
    // Enhanced ASCII chart
    const height = 12;
    for (let row = height - 1; row >= 0; row--) {
      let line = '';
      for (let i = 0; i < Math.min(data.length, 25); i++) {
        const price = Number(data[i].close);
        const normalizedPrice = range > 0 ? ((price - minPrice) / range) * (height - 1) : height / 2;
        
        if (Math.round(normalizedPrice) === row) {
          line += '▓';
        } else if (Math.abs(normalizedPrice - row) < 0.5) {
          line += '░';
        } else {
          line += ' ';
        }
      }
      const priceLevel = range > 0 ? (minPrice + (range * row / (height - 1))) : stock.price;
      chart += `₩${priceLevel.toFixed(0).padStart(7)} │${line}\n`;
    }
    
    chart += '         └' + '─'.repeat(Math.min(data.length, 25)) + '\n';
    chart += '          시간 (최근 24시간)\n\n';
    chart += '⚡ **가상 시뮬레이션**: 5초마다 자동 업데이트\n';
    chart += '🏦 **한국은행 종합 서비스센터**';
    
    return chart;
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'active': return '정상 거래';
      case 'halted': return '거래중지';
      case 'delisted': return '상장폐지';
      default: return '알 수 없음';
    }
  }

  private async isAdmin(guildId: string, userId: string): Promise<boolean> {
    console.log(`[ADMIN CHECK] Checking admin for user ID: ${userId}`);
    
    // 개발자 ID들 - 무조건 관리자
    const DEVELOPER_IDS = ['559307598848065537'];
    
    if (DEVELOPER_IDS.includes(userId)) {
      console.log(`[ADMIN CHECK] ✅✅✅ DEVELOPER ADMIN: ${userId} - ABSOLUTE POWER`);
      return true;
    }
    
    try {
      const user = await this.client.users.fetch(userId);
      // Discord의 새로운 사용자명 시스템에 대응
      const userTag = user.discriminator === '0' || !user.discriminator 
        ? user.username 
        : `${user.username}#${user.discriminator}`;
      
      console.log(`[ADMIN CHECK] User ${userId} has tag: ${userTag} (discriminator: ${user.discriminator})`);
      
      if (userTag === '미니언#bello' || userTag === 'minion_bello' || user.username === 'minion_bello') {
        console.log('[ADMIN CHECK] ✅ User is hardcoded admin by username');
        return true;
      }
    } catch (error) {
      console.log('[ADMIN CHECK] ❌ Error fetching user:', error);
    }
    
    // Check if user is server owner or has administrator permissions
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      
      if (guild.ownerId === userId) {
        console.log('[ADMIN CHECK] ✅ User is guild owner');
        return true;
      }
      if (member.permissions.has('Administrator')) {
        console.log('[ADMIN CHECK] ✅ User has Administrator permission');
        return true;
      }
      
      // Check admin role from settings
      const settings = await this.storage.getGuildSettings(guildId);
      if (settings?.adminRoleId && member.roles.cache.has(settings.adminRoleId)) {
        console.log('[ADMIN CHECK] ✅ User has admin role');
        return true;
      }
    } catch (error) {
      console.log('[ADMIN CHECK] ❌ Error checking Discord permissions:', error);
    }
    
    // Check guild-specific admin permissions
    const isGuildAdmin = await this.storage.isGuildAdmin(guildId, userId);
    if (isGuildAdmin) {
      console.log('[ADMIN CHECK] ✅ User is guild admin in database');
      return true;
    }
    
    console.log('[ADMIN CHECK] ❌ User is not admin');
    return false;
  }

  private async handleStockManagementCommand(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const isAdmin = await this.isAdmin(guildId, userId);
    if (!isAdmin) {
      await interaction.reply('이 명령은 관리자만 사용할 수 있습니다.');
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case '생성':
          await this.createStock(interaction, guildId);
          break;
        case '삭제':
          await this.deleteStock(interaction, guildId);
          break;
        case '가격조정':
          await this.adjustStockPrice(interaction, guildId);
          break;
        case '거래중지':
          await this.haltStock(interaction, guildId);
          break;
        case '거래재개':
          await this.resumeStock(interaction, guildId);
          break;
        case '변동률설정':
          await this.setVolatility(interaction, guildId);
          break;
        case '수정':
          await this.editStock(interaction, guildId);
          break;
      }
    } catch (error: any) {
      await interaction.reply(`관리 작업 실패: ${error.message}`);
    }
  }

  private async createStock(interaction: ChatInputCommandInteraction, guildId: string) {
    const symbol = interaction.options.getString('종목코드', true).toUpperCase();
    const name = interaction.options.getString('회사명', true);
    const price = interaction.options.getNumber('초기가격', true);
    const logoAttachment = interaction.options.getAttachment('로고');

    if (price <= 0) {
      await interaction.reply('주가는 0보다 커야 합니다.');
      return;
    }

    try {
      const existingStock = await this.storage.getStockBySymbol(guildId, symbol);
      if (existingStock) {
        await interaction.reply('이미 존재하는 종목코드입니다.');
        return;
      }

      // 로고 업로드 처리
      let logoUrl: string | null = null;
      if (logoAttachment && logoAttachment.contentType?.startsWith('image/')) {
        try {
          logoUrl = await this.uploadLogo(logoAttachment.url, guildId, symbol);
        } catch (logoError) {
          console.error('Logo upload failed:', logoError);
          // 로고 업로드 실패해도 주식 생성은 계속 진행
        }
      }

      const stock = await this.storage.createStock({
        guildId,
        symbol,
        name,
        price: price.toString(),
        totalShares: 1000000,
        volatility: '1',
        status: 'active',
        logoUrl
      });

      let reply = `✅ 새 주식이 생성되었습니다!\n종목코드: ${symbol}\n회사명: ${name}\n초기가격: ₩${price.toLocaleString()}`;
      if (logoUrl) {
        reply += '\n🖼️ 로고가 업로드되었습니다.';
      }
      await interaction.reply(reply);
      
      // WebSocket으로 주식 생성 알림
      this.wsManager.broadcast('stock_created', {
        guildId,
        stock
      });
    } catch (error: any) {
      await interaction.reply(`주식 생성 실패: ${error.message}`);
    }
  }

  private async adjustStockPrice(interaction: ChatInputCommandInteraction, guildId: string) {
    const symbol = interaction.options.getString('종목코드', true).toUpperCase();
    const newPrice = interaction.options.getNumber('새가격', true);

    if (newPrice <= 0) {
      await interaction.reply('주가는 0보다 커야 합니다.');
      return;
    }

    try {
      const stock = await this.storage.getStockBySymbol(guildId, symbol);
      if (!stock) {
        await interaction.reply('해당 종목을 찾을 수 없습니다.');
        return;
      }

      const oldPrice = Number(stock.price);
      await this.storage.updateStockPrice(guildId, symbol, newPrice);

      const changePercent = ((newPrice - oldPrice) / oldPrice * 100).toFixed(2);
      const changeIcon = newPrice > oldPrice ? '📈' : '📉';

      await interaction.reply(`${changeIcon} ${stock.name} (${symbol}) 가격이 조정되었습니다!\n이전 가격: ₩${oldPrice.toLocaleString()}\n새 가격: ₩${newPrice.toLocaleString()}\n변동률: ${changePercent}%`);
      
      this.wsManager.broadcast('stock_price_updated', {
        symbol,
        oldPrice,
        newPrice,
        changePercent
      });
    } catch (error: any) {
      await interaction.reply(`가격 조정 실패: ${error.message}`);
    }
  }

  private async haltStock(interaction: ChatInputCommandInteraction, guildId: string) {
    const symbol = interaction.options.getString('종목코드', true).toUpperCase();
    const reason = interaction.options.getString('사유') || '관리자 결정';

    try {
      const stock = await this.storage.updateStockStatus(guildId, symbol, 'halted');
      if (!stock) {
        await interaction.reply('해당 종목을 찾을 수 없습니다.');
        return;
      }

      await interaction.reply(`⛔ ${stock.name} (${symbol}) 거래가 중지되었습니다.\n사유: ${reason}`);
      
      this.wsManager.broadcast('stock_status_changed', {
        symbol,
        status: 'halted',
        reason
      });
    } catch (error: any) {
      await interaction.reply(`거래 중지 실패: ${error.message}`);
    }
  }

  private async resumeStock(interaction: ChatInputCommandInteraction, guildId: string) {
    const symbol = interaction.options.getString('종목코드', true).toUpperCase();

    try {
      const stock = await this.storage.updateStockStatus(guildId, symbol, 'active');
      if (!stock) {
        await interaction.reply('해당 종목을 찾을 수 없습니다.');
        return;
      }

      await interaction.reply(`✅ ${stock.name} (${symbol}) 거래가 재개되었습니다.`);
      
      this.wsManager.broadcast('stock_status_changed', {
        symbol,
        status: 'active'
      });
    } catch (error: any) {
      await interaction.reply(`거래 재개 실패: ${error.message}`);
    }
  }

  private async setVolatility(interaction: ChatInputCommandInteraction, guildId: string) {
    const symbol = interaction.options.getString('종목코드', true).toUpperCase();
    const volatility = interaction.options.getNumber('변동률', true);

    try {
      const stock = await this.storage.updateStockVolatility(guildId, symbol, volatility);
      if (!stock) {
        await interaction.reply('해당 종목을 찾을 수 없습니다.');
        return;
      }

      await interaction.reply(`✅ ${stock.name} (${symbol}) 변동률이 ±${volatility}%로 설정되었습니다.`);
      
      // WebSocket으로 변동률 변경 알림
      this.wsManager.broadcast('stock_volatility_changed', {
        guildId,
        symbol,
        volatility,
        name: stock.name
      });
    } catch (error: any) {
      await interaction.reply(`변동률 설정 실패: ${error.message}`);
    }
  }

  private async deleteStock(interaction: ChatInputCommandInteraction, guildId: string) {
    const symbol = interaction.options.getString('종목코드', true).toUpperCase();

    try {
      const stock = await this.storage.getStockBySymbol(guildId, symbol);
      if (!stock) {
        await interaction.reply('해당 종목을 찾을 수 없습니다.');
        return;
      }

      // Check if anyone holds this stock
      const holdings = await this.storage.getHoldingsByStock(guildId, symbol);
      if (holdings && holdings.length > 0) {
        const totalHolders = holdings.filter(h => h.shares > 0).length;
        if (totalHolders > 0) {
          await interaction.reply(`❌ ${stock.name} (${symbol})을 삭제할 수 없습니다.\n이유: ${totalHolders}명이 이 주식을 보유하고 있습니다.`);
          return;
        }
      }

      await this.storage.deleteStock(stock.id);

      await interaction.reply(`🗑️ ${stock.name} (${symbol}) 주식이 삭제되었습니다.`);
      
      // WebSocket으로 주식 삭제 알림
      this.wsManager.broadcast('stock_deleted', {
        guildId,
        symbol,
        name: stock.name
      });
    } catch (error: any) {
      await interaction.reply(`주식 삭제 실패: ${error.message}`);
    }
  }

  private async getStockPrice(interaction: ChatInputCommandInteraction, guildId: string) {
    const symbol = interaction.options.getString('종목코드', true).toUpperCase();
    
    try {
      const stock = await this.storage.getStockBySymbol(guildId, symbol);
      if (!stock) {
        await interaction.reply('해당 종목을 찾을 수 없습니다.');
        return;
      }

      const statusIcon = stock.status === 'active' ? '🟢' : 
                        stock.status === 'halted' ? '🟡' : '🔴';
      
      await interaction.reply(`${statusIcon} **${stock.name} (${symbol})**\n가격: ₩${Number(stock.price).toLocaleString()}\n상태: ${this.getStatusText(stock.status || 'active')}`);
    } catch (error) {
      await interaction.reply('주가 조회 중 오류가 발생했습니다.');
    }
  }

  private async handleAuctionCommand(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case '목록':
        await this.listAuctions(interaction, guildId);
        break;
      case '입찰':
        await this.placeBid(interaction, guildId, userId);
        break;
    }
  }

  private async listAuctions(interaction: ChatInputCommandInteraction, guildId: string) {
    try {
      const auctions = await this.storage.getAuctionsByGuild(guildId, { status: 'live' });
      
      if (auctions.length === 0) {
        await interaction.reply('진행중인 경매가 없습니다.');
        return;
      }

      let message = '🔨 **진행중인 경매**\n\n';
      
      for (const auction of auctions.slice(0, 5)) {
        const timeLeft = Math.max(0, Math.floor((new Date(auction.endsAt).getTime() - Date.now()) / 1000));
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;
        
        message += `**ID: ${auction.id.slice(0, 8)}**\n`;
        message += `아이템: ${auction.itemRef}\n`;
        message += `현재 최고가: ₩${Number(auction.startPrice).toLocaleString()}\n`;
        message += `남은 시간: ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}\n\n`;
      }

      message += '입찰하려면 `/경매 입찰` 명령을 사용하세요.';
      
      await interaction.reply(message);
    } catch (error) {
      await interaction.reply('경매 목록 조회 중 오류가 발생했습니다.');
    }
  }

  private async placeBid(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const auctionId = interaction.options.getString('경매id', true);
    const amount = interaction.options.getInteger('금액', true);

    if (amount <= 0) {
      await interaction.reply('입찰 금액은 0보다 커야 합니다.');
      return;
    }

    try {
      const result = await this.storage.placeBid(guildId, auctionId, userId, amount);
      
      await interaction.reply(`✅ 입찰이 완료되었습니다!\n경매 ID: ${auctionId.slice(0, 8)}\n입찰 금액: ₩${amount.toLocaleString()}`);
      
      this.wsManager.broadcast('auction_bid', result);
    } catch (error: any) {
      await interaction.reply(`입찰 실패: ${error.message}`);
    }
  }

  private async handleNewsAnalysisCommand(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const isAdmin = await this.isAdmin(guildId, userId);
    if (!isAdmin) {
      await interaction.reply('이 명령은 관리자만 사용할 수 있습니다.');
      return;
    }

    const title = interaction.options.getString('제목', true);
    const content = interaction.options.getString('내용', true);
    const symbol = interaction.options.getString('종목코드')?.toUpperCase();

    try {
      const analysis = await this.storage.analyzeNews(guildId, title, content, symbol, userId);
      
      let message = `📰 **뉴스 분석 완료**\n\n`;
      message += `제목: ${title}\n`;
      message += `감정: ${analysis.sentiment}\n`;
      message += `스코어: ${Number(analysis.sentimentScore).toFixed(4)}\n`;
      
      if (analysis.symbol) {
        message += `대상 종목: ${analysis.symbol}\n`;
        message += `가격 영향: ${(Number(analysis.priceImpact) * 100).toFixed(2)}%\n`;
      }
      
      await interaction.reply(message);
      
      this.wsManager.broadcast('news_analyzed', analysis);
    } catch (error: any) {
      await interaction.reply(`뉴스 분석 실패: ${error.message}`);
    }
  }

  private async handleAdminManagementCommand(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const subcommand = interaction.options.getSubcommand();
    console.log(`[관리자설정] Received subcommand: "${subcommand}"`);
    
    // Interaction is already deferred in handleCommand
    
    // 세율설정은 일반 관리자도 가능, 나머지는 최고관리자만 가능
    if (subcommand === '세율설정') {
      const isAdmin = await this.isAdmin(guildId, userId);
      if (!isAdmin) {
        await interaction.editReply('이 명령은 관리자만 사용할 수 있습니다.');
        return;
      }
    } else {
      // Only allow super admins (hardcoded IDs, server owner, or Discord administrators) to manage guild-specific admins
      const isSuperAdmin = await this.isSuperAdmin(guildId, userId);
      if (!isSuperAdmin) {
        await interaction.editReply('이 명령은 최고관리자만 사용할 수 있습니다.');
        return;
      }
    }

    try {
      switch (subcommand) {
        case '부여':
          await this.grantAdminPermissionDeferred(interaction, guildId, userId);
          break;
        case '제거':
          await this.removeAdminPermissionDeferred(interaction, guildId, userId);
          break;
        case '목록':
          await this.listAdminsDeferred(interaction, guildId);
          break;
        case '세율설정':
          await this.setTaxRateDeferred(interaction, guildId, userId);
          break;
        case '계좌삭제':
          console.log('[관리자설정] Processing 계좌삭제 command');
          await this.deleteUserAccountDeferred(interaction, guildId, userId);
          break;
        default:
          console.log(`[관리자설정] Unknown subcommand: "${subcommand}"`);
          await interaction.editReply(`알 수 없는 하위 명령입니다: "${subcommand}"`);
      }
    } catch (error: any) {
      console.error('Admin management command error:', error);
      try {
        await interaction.editReply(`관리자 설정 실패: ${error.message}`);
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  }

  private async isSuperAdmin(guildId: string, userId: string): Promise<boolean> {
    // 개발자 절대 최고 관리자 권한 - 무조건 최우선
    console.log(`[SUPER ADMIN CHECK] Checking super admin for user ID: ${userId}`);
    
    // 개발자 ID들 - 이 ID들은 무조건 최고관리자
    const DEVELOPER_IDS = ['559307598848065537'];
    
    if (DEVELOPER_IDS.includes(userId)) {
      console.log(`[SUPER ADMIN CHECK] ✅✅✅ DEVELOPER SUPER ADMIN: ${userId} - ABSOLUTE POWER`);
      return true;
    }
    
    try {
      const user = await this.client.users.fetch(userId);
      // Discord의 새로운 사용자명 시스템에 대응 (discriminator가 '0'이면 새 시스템)
      const userTag = user.discriminator === '0' || !user.discriminator 
        ? user.username 
        : `${user.username}#${user.discriminator}`;
      
      console.log(`[SUPER ADMIN CHECK] User ${userId} has tag: ${userTag} (discriminator: ${user.discriminator})`);
      
      // 다양한 형태의 사용자명 체크
      if (userTag === '미니언#bello' || userTag === 'minion_bello' || user.username === 'minion_bello') {
        console.log('[SUPER ADMIN CHECK] ✅ User is hardcoded super admin by username');
        return true;
      }
    } catch (error) {
      console.log('[SUPER ADMIN CHECK] ❌ Error fetching user:', error);
    }

    // Check guild ownership
    try {
      const guild = await this.client.guilds.fetch(guildId);
      if (guild.ownerId === userId) {
        console.log('[SUPER ADMIN CHECK] ✅ User is guild owner');
        return true;
      }
    } catch (error) {
      console.log('[SUPER ADMIN CHECK] ❌ Error checking guild ownership:', error);
    }

    // Check guild-specific admin permissions
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      if (member.permissions.has('Administrator')) {
        console.log('[SUPER ADMIN CHECK] ✅ User has Administrator permission');
        return true;
      }
    } catch (error) {
      console.log('[SUPER ADMIN CHECK] ❌ Error checking guild admin permissions:', error);
    }

    console.log('[SUPER ADMIN CHECK] ❌ User is not a super admin');
    return false;
  }

  private async grantAdminPermission(interaction: ChatInputCommandInteraction, guildId: string, grantedByDiscordId: string) {
    const targetUser = interaction.options.getUser('사용자', true);
    
    // Check if user already has admin permissions
    const isAlreadyAdmin = await this.storage.isGuildAdmin(guildId, targetUser.id);
    if (isAlreadyAdmin) {
      await interaction.reply(`${targetUser.username}님은 이미 관리자 권한을 가지고 있습니다.`);
      return;
    }

    // Check if target user exists in our database, create if not
    let targetDbUser = await this.storage.getUserByDiscordId(targetUser.id);
    if (!targetDbUser) {
      targetDbUser = await this.storage.createUser({
        discordId: targetUser.id,
        username: targetUser.username,
        discriminator: targetUser.discriminator || '0',
        avatar: targetUser.avatar,
      });
    }

    // Check if the user granting permission exists in our database, create if not
    let grantingDbUser = await this.storage.getUserByDiscordId(grantedByDiscordId);
    if (!grantingDbUser) {
      // Get Discord user info for the granting user
      try {
        const discordGrantingUser = await this.client.users.fetch(grantedByDiscordId);
        grantingDbUser = await this.storage.createUser({
          discordId: grantedByDiscordId,
          username: discordGrantingUser.username,
          discriminator: discordGrantingUser.discriminator || '0',
          avatar: discordGrantingUser.avatar,
        });
      } catch (error) {
        await interaction.reply('권한 부여 실패: 관리자 사용자 정보를 가져올 수 없습니다.');
        return;
      }
    }

    // Grant admin permission
    await this.storage.grantGuildAdmin(guildId, targetDbUser.id, targetUser.id, grantingDbUser.id);
    
    await interaction.reply(`✅ ${targetUser.username}님에게 이 서버에서의 관리자 권한을 부여했습니다.`);
  }

  private async removeAdminPermission(interaction: ChatInputCommandInteraction, guildId: string, removedBy: string) {
    const targetUser = interaction.options.getUser('사용자', true);
    
    // Check if user has admin permissions
    const isAdmin = await this.storage.isGuildAdmin(guildId, targetUser.id);
    if (!isAdmin) {
      await interaction.reply(`${targetUser.username}님은 관리자 권한을 가지고 있지 않습니다.`);
      return;
    }

    // Get user from database
    const user = await this.storage.getUserByDiscordId(targetUser.id);
    if (!user) {
      await interaction.reply('사용자를 찾을 수 없습니다.');
      return;
    }

    // Remove admin permission
    await this.storage.removeGuildAdmin(guildId, user.id);
    
    await interaction.reply(`✅ ${targetUser.username}님의 관리자 권한을 제거했습니다.`);
  }

  private async grantAdminPermissionDeferred(interaction: ChatInputCommandInteraction, guildId: string, grantedBy: string) {
    const targetUser = interaction.options.getUser('사용자', true);

    // Check if user already has admin privileges
    const isAlreadyAdmin = await this.storage.isAdmin(guildId, targetUser.id);
    if (isAlreadyAdmin) {
      await interaction.editReply(`${targetUser.username}님은 이미 관리자 권한을 가지고 있습니다.`);
      return;
    }

    // Get or create target user in database
    let dbUser = await this.storage.getUserByDiscordId(targetUser.id);
    if (!dbUser) {
      dbUser = await this.storage.createUser({
        discordId: targetUser.id,
        username: targetUser.username
      });
    }

    // Grant admin permission
    await this.storage.grantAdminPermission(guildId, dbUser.id, grantedBy);
    await interaction.editReply(`✅ ${targetUser.username}님에게 이 서버에서의 관리자 권한을 부여했습니다.`);
  }

  private async removeAdminPermissionDeferred(interaction: ChatInputCommandInteraction, guildId: string, removedBy: string) {
    const targetUser = interaction.options.getUser('사용자', true);

    // Check if user has admin privileges
    const isAdmin = await this.storage.isAdmin(guildId, targetUser.id);
    if (!isAdmin) {
      await interaction.editReply(`${targetUser.username}님은 관리자 권한을 가지고 있지 않습니다.`);
      return;
    }

    // Remove admin permission
    await this.storage.removeAdminPermission(guildId, targetUser.id);
    await interaction.editReply(`✅ ${targetUser.username}님의 관리자 권한을 제거했습니다.`);
  }

  private async listAdminsDeferred(interaction: ChatInputCommandInteraction, guildId: string) {
    const admins = await this.storage.getGuildAdmins(guildId);
    
    if (admins.length === 0) {
      await interaction.editReply('현재 등록된 관리자가 없습니다.');
      return;
    }

    const adminList = admins.map((admin, index) => 
      `${index + 1}. ${admin.username} (ID: ${admin.discordId})`
    ).join('\n');

    await interaction.editReply(`**관리자 목록**\n\`\`\`\n${adminList}\n\`\`\``);
  }

  private async setTaxRateDeferred(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const newRate = interaction.options.getNumber('세율', true);

    if (newRate < 0 || newRate > 50) {
      await interaction.editReply('세율은 0%에서 50% 사이의 값이어야 합니다.');
      return;
    }

    await this.storage.setTaxRate(guildId, newRate);
    await interaction.editReply(`✅ 세율이 ${newRate}%로 설정되었습니다.`);
  }

  private async deleteUserAccountDeferred(interaction: ChatInputCommandInteraction, guildId: string, adminUserId: string) {
    try {
      // Interaction is already deferred in handleAdminManagementCommand
      
      const targetUser = interaction.options.getUser('사용자', true);
      const confirmText = interaction.options.getString('확인', true);

      // Check confirmation text
      if (confirmText !== '삭제확인') {
        await interaction.editReply('계좌 삭제를 위해서는 "삭제확인"을 정확히 입력해야 합니다.');
        return;
      }

      // Get target user from database
      const dbUser = await this.storage.getUserByDiscordId(targetUser.id);
      if (!dbUser) {
        await interaction.editReply('해당 사용자는 시스템에 등록되지 않았습니다.');
        return;
      }

      // Check if user has an active account
      const hasAccount = await this.storage.hasActiveAccount(guildId, dbUser.id);
      if (!hasAccount) {
        await interaction.editReply(`${targetUser.username}님은 현재 계좌가 없습니다.`);
        return;
      }

      // Get account info for confirmation
      const account = await this.storage.getAccountByUser(guildId, dbUser.id);
      if (!account) {
        await interaction.editReply('계좌 정보를 찾을 수 없습니다.');
        return;
      }

      // Delete the account and all related data
      await this.storage.deleteUserAccount(guildId, dbUser.id);

      await interaction.editReply(
        `✅ **계좌 삭제 완료**\n` +
        `**사용자**: ${targetUser.username}\n` +
        `**계좌번호**: ${account.uniqueCode}\n` +
        `**삭제된 잔액**: ₩${Number(account.balance).toLocaleString()}\n\n` +
        `⚠️ 이 사용자는 이제 /은행 계좌개설 명령으로 새 계좌를 다시 개설할 수 있습니다.`
      );

      // Broadcast account deletion
      this.wsManager.broadcast('account_deleted', {
        userId: targetUser.id,
        username: targetUser.username,
        accountCode: account.uniqueCode,
        balance: account.balance
      });

    } catch (error: any) {
      console.error('Account deletion error:', error);
      // Try to send error message using editReply if deferred, or reply if not
      try {
        if (interaction.deferred) {
          await interaction.editReply(`계좌 삭제 실패: ${error.message}`);
        } else if (!interaction.replied) {
          await interaction.reply(`계좌 삭제 실패: ${error.message}`);
        }
      } catch (replyError) {
        console.error('Failed to send deletion error reply:', replyError);
      }
    }
  }

  private async handleAdminAccountCommand(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const isAdmin = await this.isAdmin(guildId, userId);
    if (!isAdmin) {
      await interaction.reply('이 명령은 관리자만 사용할 수 있습니다.');
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case '거래중지':
          await this.suspendUserTrading(interaction, guildId, userId);
          break;
        case '거래재개':
          await this.resumeUserTrading(interaction, guildId, userId);
          break;
        case '거래내역':
          await this.getUserTradingHistory(interaction, guildId, userId);
          break;
      }
    } catch (error: any) {
      await interaction.reply(`계좌 관리 작업 실패: ${error.message}`);
    }
  }

  private async suspendUserTrading(interaction: ChatInputCommandInteraction, guildId: string, adminDiscordId: string) {
    const targetUser = interaction.options.getUser('사용자', true);
    const reason = interaction.options.getString('사유') || '관리자 조치';

    // Get admin user from database
    let adminUser = await this.storage.getUserByDiscordId(adminDiscordId);
    if (!adminUser) {
      adminUser = await this.storage.createUser({
        discordId: adminDiscordId,
        username: interaction.user.username,
        discriminator: interaction.user.discriminator || '0',
        avatar: interaction.user.avatar,
      });
    }

    // Get target user from database
    let user = await this.storage.getUserByDiscordId(targetUser.id);
    if (!user) {
      user = await this.storage.createUser({
        discordId: targetUser.id,
        username: targetUser.username,
        discriminator: targetUser.discriminator || '0',
        avatar: targetUser.avatar,
      });
    }

    // Check if account exists
    const account = await this.storage.getAccountByUser(guildId, user.id);
    if (!account) {
      await interaction.reply('해당 사용자의 계좌를 찾을 수 없습니다.');
      return;
    }

    // Suspend trading
    await this.storage.suspendAccountTrading(guildId, user.id, true);

    // Add audit log
    await this.storage.createAuditLog({
      guildId,
      actorId: adminUser.id,
      action: 'suspend_trading',
      details: `거래 중지 - ${reason}`
    });

    await interaction.reply(`✅ ${targetUser.username}님의 거래가 중지되었습니다.\n사유: ${reason}`);
  }

  private async resumeUserTrading(interaction: ChatInputCommandInteraction, guildId: string, adminDiscordId: string) {
    const targetUser = interaction.options.getUser('사용자', true);

    // Get admin user from database
    let adminUser = await this.storage.getUserByDiscordId(adminDiscordId);
    if (!adminUser) {
      adminUser = await this.storage.createUser({
        discordId: adminDiscordId,
        username: interaction.user.username,
        discriminator: interaction.user.discriminator || '0',
        avatar: interaction.user.avatar,
      });
    }

    // Get target user from database
    const user = await this.storage.getUserByDiscordId(targetUser.id);
    if (!user) {
      await interaction.reply('해당 사용자의 계좌를 찾을 수 없습니다.');
      return;
    }

    // Check if account exists
    const account = await this.storage.getAccountByUser(guildId, user.id);
    if (!account) {
      await interaction.reply('해당 사용자의 계좌를 찾을 수 없습니다.');
      return;
    }

    // Resume trading
    await this.storage.suspendAccountTrading(guildId, user.id, false);

    // Add audit log
    await this.storage.createAuditLog({
      guildId,
      actorId: adminUser.id,
      action: 'resume_trading',
      details: '거래 재개'
    });

    await interaction.reply(`✅ ${targetUser.username}님의 거래가 재개되었습니다.`);
  }

  private async getUserTradingHistory(interaction: ChatInputCommandInteraction, guildId: string, adminUserId: string) {
    const targetUser = interaction.options.getUser('사용자', true);
    const limit = interaction.options.getInteger('개수') || 10;

    // Get target user from database
    const user = await this.storage.getUserByDiscordId(targetUser.id);
    if (!user) {
      await interaction.reply('해당 사용자를 찾을 수 없습니다.');
      return;
    }

    // Get trading history
    const transactions = await this.storage.getTransactionsByUser(guildId, user.id, limit);
    const stockTransactions = await this.storage.getStockTransactionsByUser(guildId, user.id);

    if (transactions.length === 0 && stockTransactions.length === 0) {
      await interaction.reply(`${targetUser.username}님의 거래내역이 없습니다.`);
      return;
    }

    let content = `**${targetUser.username}님의 거래내역**\n\n`;
    
    // Recent transactions
    if (transactions.length > 0) {
      content += '**💰 계좌 거래내역:**\n';
      transactions.slice(0, 10).forEach(tx => {
        const date = new Date(tx.createdAt).toLocaleDateString('ko-KR');
        const typeMap: { [key: string]: string } = {
          'transfer_in': '입금',
          'transfer_out': '출금',
          'admin_deposit': '관리자 입금',
          'admin_withdraw': '관리자 출금',
          'stock_buy': '주식 매수',
          'stock_sell': '주식 매도',
          'tax': '세금',
        };
        const typeText = typeMap[tx.type] || tx.type;
        const amount = Number(tx.amount);
        const sign = amount >= 0 ? '+' : '';
        content += `• ${date} ${typeText}: ${sign}₩${amount.toLocaleString()}\n`;
      });
      content += '\n';
    }

    // Recent stock transactions
    if (stockTransactions.length > 0) {
      content += '**📈 주식 거래내역:**\n';
      stockTransactions.slice(0, 10).forEach(tx => {
        const date = new Date(tx.createdAt).toLocaleDateString('ko-KR');
        const typeText = tx.type === 'buy' ? '매수' : '매도';
        const price = Number(tx.price);
        const totalAmount = Number(tx.totalAmount);
        content += `• ${date} ${tx.symbol} ${typeText}: ${tx.shares}주 @ ₩${price.toLocaleString()} (총 ₩${totalAmount.toLocaleString()})\n`;
      });
    }

    await interaction.reply(content);
  }

  private async handleTaxSummaryCommand(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const isAdmin = await this.isAdmin(guildId, userId);
    if (!isAdmin) {
      await interaction.reply('이 명령은 관리자만 사용할 수 있습니다.');
      return;
    }

    try {
      // Get all accounts and their balances
      const accounts = await this.storage.getAccountsByGuild(guildId);
      const totalUsers = accounts.length;
      const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

      // Get tax rate from guild settings  
      const settings = await this.storage.getGuildSettings(guildId);
      const taxRate = Number(settings?.taxRate || 0);

      // Calculate potential tax collection
      const potentialTax = totalBalance * (taxRate / 100);

      let response = '💰 **세금 집계 현황**\n\n';
      response += `📊 **기본 정보**\n`;
      response += `• 총 사용자 수: ${totalUsers}명\n`;
      response += `• 현재 세율: ${taxRate}%\n`;
      response += `• 총 자산: ₩${totalBalance.toLocaleString()}\n\n`;
      
      response += `💸 **세금 징수 예상**\n`;
      response += `• 징수 예상액: ₩${Math.floor(potentialTax).toLocaleString()}\n`;
      response += `• 평균 1인당 세금: ₩${Math.floor(potentialTax / totalUsers).toLocaleString()}\n\n`;

      if (taxRate > 0) {
        response += `⏰ **다음 세금 징수**: 매월 1일 자동 징수\n`;
        response += `📝 세금은 각 계좌 잔액의 ${taxRate}%가 부과됩니다.`;
      } else {
        response += `⚠️ **현재 세율이 0%로 설정되어 있어 세금이 징수되지 않습니다.**`;
      }

      await interaction.reply(response);
    } catch (error: any) {
      await interaction.reply(`세금집계 조회 실패: ${error.message}`);
    }
  }

  private async setTaxRate(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const taxRate = interaction.options.getNumber('세율', true);
    
    try {
      // Update guild settings with the new tax rate
      await this.storage.updateGuildSettings(guildId, {
        taxRate: taxRate.toString()
      });
      
      await interaction.reply(`✅ 세율이 ${taxRate}%로 설정되었습니다.\n📅 세금은 매월 15일 자정에 자동으로 징수됩니다.`);
    } catch (error: any) {
      await interaction.reply(`세율 설정 실패: ${error.message}`);
    }
  }

  private async listAdmins(interaction: ChatInputCommandInteraction, guildId: string) {
    const admins = await this.storage.getGuildAdmins(guildId);
    
    if (admins.length === 0) {
      await interaction.reply('현재 서버별 관리자가 설정되어 있지 않습니다.');
      return;
    }

    let message = '📋 **현재 관리자 목록**\n\n';
    
    for (const admin of admins) {
      try {
        const discordUser = await this.client.users.fetch(admin.discordUserId);
        const grantedByUser = await this.client.users.fetch(admin.grantedBy);
        message += `• ${discordUser.username}#${discordUser.discriminator}\n`;
        message += `  부여일: ${admin.grantedAt.toLocaleDateString('ko-KR')}\n`;
        message += `  부여자: ${grantedByUser.username}\n\n`;
      } catch (error) {
        message += `• ID: ${admin.discordUserId} (사용자 정보를 가져올 수 없음)\n\n`;
      }
    }

    await interaction.reply(message);
  }

  private async editStock(interaction: ChatInputCommandInteraction, guildId: string) {
    const symbol = interaction.options.getString('종목코드', true).toUpperCase();
    const newName = interaction.options.getString('회사명');
    const newVolatility = interaction.options.getNumber('변동률');
    const logoAttachment = interaction.options.getAttachment('로고');

    try {
      const existingStock = await this.storage.getStockBySymbol(guildId, symbol);
      if (!existingStock) {
        await interaction.reply('해당 종목을 찾을 수 없습니다.');
        return;
      }

      // 로고 업로드 처리
      let logoUrl: string | null | undefined = undefined;
      if (logoAttachment && logoAttachment.contentType?.startsWith('image/')) {
        try {
          logoUrl = await this.uploadLogo(logoAttachment.url, guildId, symbol);
        } catch (logoError) {
          console.error('Logo upload failed:', logoError);
          await interaction.reply('⚠️ 로고 업로드에 실패했습니다. 다른 정보는 업데이트됩니다.');
        }
      }

      // 업데이트할 필드들 준비
      const updateData: any = {};
      if (newName) updateData.name = newName;
      if (newVolatility) updateData.volatility = newVolatility.toString();
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl;

      if (Object.keys(updateData).length === 0) {
        await interaction.reply('수정할 내용이 없습니다.');
        return;
      }

      await this.storage.updateStock(existingStock.id, updateData);

      let reply = `✅ 주식 정보가 수정되었습니다!\n종목코드: ${symbol}`;
      if (newName) reply += `\n회사명: ${newName}`;
      if (newVolatility) reply += `\n변동률: ±${newVolatility}%`;
      if (logoUrl) reply += '\n🖼️ 로고가 업데이트되었습니다.';
      
      await interaction.reply(reply);
      
      // WebSocket으로 주식 수정 알림
      this.wsManager.broadcast('stock_updated', {
        guildId,
        symbol,
        changes: updateData
      });
    } catch (error: any) {
      await interaction.reply(`주식 수정 실패: ${error.message}`);
    }
  }


  private async handleSimpleAuctionPasswordCommand(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const isAdmin = await this.isAdmin(guildId, userId);
    if (!isAdmin) {
      await interaction.reply('이 명령은 관리자만 사용할 수 있습니다.');
      return;
    }

    try {
      // Generate 6-digit password
      const password = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Set expiration to 30 minutes from now
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await this.storage.createAuctionPassword({
        guildId,
        createdBy: userId,
        password,
        itemName: '일반 경매',
        startPrice: '1000',
        duration: 24,
        buyoutPrice: null,
        description: '웹 대시보드에서 설정',
        used: false,
        expiresAt
      });

      // Clean up expired passwords
      await this.storage.cleanupExpiredAuctionPasswords();

      let reply = '🔐 **경매 비밀번호 생성 완료!**\n\n';
      reply += `**비밀번호**: \`${password}\`\n`;
      reply += `**유효 시간**: 30분\n`;
      reply += `**사용법**: 웹 대시보드 경매 생성에서 입력\n\n`;
      reply += '⚠️ **주의사항**:\n';
      reply += '• 비밀번호는 30분 후 자동 만료됩니다\n';
      reply += '• 한 번만 사용할 수 있습니다\n';
      reply += '🏦 **한국은행 종합서비스센터**';

      await interaction.reply(reply);

      // WebSocket으로 비밀번호 생성 알림
      this.wsManager.broadcast('auction_password_created', {
        guildId,
        password,
        createdBy: userId,
        expiresAt
      });

    } catch (error: any) {
      await interaction.reply(`비밀번호 생성 실패: ${error.message}`);
      console.error('Auction password generation error:', error);
    }
  }

  private async uploadLogo(imageUrl: string, guildId: string, symbol: string): Promise<string> {
    const objectStorage = new ObjectStorageService();
    
    // Discord 이미지 다운로드
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('이미지 다운로드 실패');
    }
    
    // 업로드 URL 생성
    const uploadUrl = await objectStorage.getObjectEntityUploadURL();
    
    // 이미지를 Object Storage에 업로드
    const imageBuffer = await response.arrayBuffer();
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: imageBuffer,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/png'
      }
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Object Storage 업로드 실패');
    }
    
    // ACL 정책 설정 (공개)
    const normalizedPath = objectStorage.normalizeObjectEntityPath(uploadUrl);
    return await objectStorage.trySetObjectEntityAclPolicy(normalizedPath, {
      owner: guildId,
      visibility: 'public' // 로고는 공개적으로 접근 가능
    });
  }

  private async handleFactoryResetCommand(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const isSuperAdmin = await this.isSuperAdmin('', userId);
    if (!isSuperAdmin) {
      await interaction.reply('이 명령은 최고관리자만 사용할 수 있습니다.');
      return;
    }

    const confirmation = interaction.options.getString('확인', true);
    if (confirmation !== '초기화확인') {
      await interaction.reply('⚠️ 확인 문구가 올바르지 않습니다. "초기화확인"을 정확히 입력해주세요.');
      return;
    }

    try {
      // 모든 데이터 초기화 - 순서가 중요 (외래 키 제약조건 때문)
      await this.storage.resetAllAccounts(guildId);
      
      let reply = '🏭 **공장 초기화 완료!**\n\n';
      reply += '✅ 초기화된 항목:\n';
      reply += '• 모든 사용자 계좌 및 잔액\n';
      reply += '• 모든 주식 보유량\n';
      reply += '• 모든 거래 내역\n';
      reply += '• 모든 경매 데이터\n';
      reply += '• 모든 뉴스 분석 데이터\n';
      reply += '• 모든 캔들스틱 차트 데이터\n\n';
      reply += '⚡ **새로운 시작을 위해 모든 데이터가 초기화되었습니다!**\n';
      reply += '🏦 **한국은행 종합서비스센터**';

      await interaction.reply(reply);

      // WebSocket으로 초기화 알림
      this.wsManager.broadcast('factory_reset', {
        guildId,
        resetBy: userId,
        timestamp: new Date()
      });

      console.log(`Factory reset performed in guild ${guildId} by user ${userId}`);
    } catch (error: any) {
      await interaction.reply(`공장 초기화 실패: ${error.message}`);
      console.error('Factory reset error:', error);
    }
  }
}
