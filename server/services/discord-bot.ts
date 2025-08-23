import { Client, GatewayIntentBits, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { IStorage } from '../storage';
import { WebSocketManager } from './websocket-manager';

export class DiscordBot {
  private client: Client;
  private storage: IStorage;
  private wsManager: WebSocketManager;

  constructor(storage: IStorage, wsManager: WebSocketManager) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
    });
    this.storage = storage;
    this.wsManager = wsManager;
  }

  async start() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      console.error('DISCORD_BOT_TOKEN is required');
      return;
    }

    await this.client.login(token);
    await this.registerCommands();
    this.setupEventHandlers();

    console.log('Discord bot started successfully');
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
            .addUserOption(option =>
              option.setName('받는사람')
                .setDescription('받을 사용자')
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
            .setDescription('새 주식을 생성합니다')
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
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('가격조정')
            .setDescription('주식 가격을 조정합니다')
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
            .setDescription('주식 거래를 중지합니다')
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
            .setDescription('주식 거래를 재개합니다')
            .addStringOption(option =>
              option.setName('종목코드')
                .setDescription('종목코드')
                .setRequired(true)
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

    this.client.on('ready', () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}`);
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
        default:
          await interaction.reply('알 수 없는 명령입니다.');
      }
    } catch (error) {
      console.error('Command error:', error);
      await interaction.reply('명령 처리 중 오류가 발생했습니다.');
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
      // Check if account already exists
      const existingAccount = await this.storage.getAccountByUser(guildId, userId);
      if (existingAccount) {
        await interaction.reply('이미 계좌가 개설되어 있습니다.');
        return;
      }

      // Create user if doesn't exist
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

      await interaction.reply(`✅ 계좌가 성공적으로 개설되었습니다!\n계좌번호: ${uniqueCode}\n초기 잔액: ₩1,000,000`);
    } catch (error) {
      await interaction.reply('계좌 개설 중 오류가 발생했습니다.');
    }
  }

  private async checkBalance(interaction: ChatInputCommandInteraction, guildId: string, userId: string) {
    const targetUser = interaction.options.getUser('사용자');
    const queryUserId = targetUser ? targetUser.id : userId;

    // Check if querying another user and if user is admin
    if (targetUser && targetUser.id !== userId) {
      const isAdmin = await this.isAdmin(guildId, userId);
      if (!isAdmin) {
        await interaction.reply('다른 사용자의 잔액은 관리자만 조회할 수 있습니다.');
        return;
      }
    }

    try {
      const account = await this.storage.getAccountByUser(guildId, queryUserId);
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
    const targetUser = interaction.options.getUser('받는사람', true);
    const amount = interaction.options.getInteger('금액', true);
    const memo = interaction.options.getString('메모') || '';

    if (targetUser.id === userId) {
      await interaction.reply('자신에게는 송금할 수 없습니다.');
      return;
    }

    if (amount <= 0) {
      await interaction.reply('송금 금액은 0보다 커야 합니다.');
      return;
    }

    try {
      const fromAccount = await this.storage.getAccountByUser(guildId, userId);
      const toAccount = await this.storage.getAccountByUser(guildId, targetUser.id);

      if (!fromAccount) {
        await interaction.reply('계좌를 찾을 수 없습니다. /은행 계좌개설 명령으로 계좌를 먼저 개설해주세요.');
        return;
      }

      if (!toAccount) {
        await interaction.reply('받는 사람의 계좌를 찾을 수 없습니다.');
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

      // Execute transfer
      await this.storage.transferMoney(guildId, userId, targetUser.id, amount, memo);

      await interaction.reply(`✅ ₩${amount.toLocaleString()}을 ${targetUser.username}에게 송금했습니다.\n메모: ${memo}`);
      
      this.wsManager.broadcast('transaction_completed', {
        type: 'transfer',
        from: userId,
        to: targetUser.id,
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
        message += `   상태: ${this.getStatusText(stock.status)}\n\n`;
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
      return `${stock.name} (${stock.symbol}) - 데이터 없음`;
    }

    const prices = data.map(d => Number(d.close));
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const range = maxPrice - minPrice;
    
    let chart = `${stock.name} (${stock.symbol}) - 실시간 차트\n`;
    chart += `현재가: ₩${Number(stock.price).toLocaleString()}\n`;
    chart += `상태: ${this.getStatusText(stock.status)}\n\n`;
    
    // Simple line chart representation
    const height = 10;
    for (let row = height - 1; row >= 0; row--) {
      let line = '';
      for (let i = 0; i < Math.min(data.length, 20); i++) {
        const price = Number(data[i].close);
        const normalizedPrice = range > 0 ? ((price - minPrice) / range) * (height - 1) : height / 2;
        
        if (Math.round(normalizedPrice) === row) {
          line += '█';
        } else {
          line += ' ';
        }
      }
      chart += `${(minPrice + (range * row / (height - 1))).toFixed(0).padStart(6)} |${line}\n`;
    }
    
    chart += '       +' + '-'.repeat(Math.min(data.length, 20)) + '\n';
    chart += '        시간 (최근 24시간)\n';
    chart += '\n⚡ 5초 시뮬레이션으로 자동 업데이트됩니다.';
    
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

  private async isAdmin(guildId: string, userId: string): boolean {
    if (userId === '559307598848065537') return true;
    
    try {
      const user = await this.client.users.fetch(userId);
      const userTag = `${user.username}#${user.discriminator}`;
      if (userTag === '미니언#bello') return true;
    } catch (error) {
      // Continue with other checks if user fetch fails
    }
    
    // Check if user is server owner or has administrator permissions
    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    
    if (guild.ownerId === userId) return true;
    if (member.permissions.has('Administrator')) return true;
    
    // Check admin role from settings
    const settings = await this.storage.getGuildSettings(guildId);
    if (settings?.adminRoleId && member.roles.cache.has(settings.adminRoleId)) {
      return true;
    }
    
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
        case '가격조정':
          await this.adjustStockPrice(interaction, guildId);
          break;
        case '거래중지':
          await this.haltStock(interaction, guildId);
          break;
        case '거래재개':
          await this.resumeStock(interaction, guildId);
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

      const stock = await this.storage.createStock({
        guildId,
        symbol,
        name,
        price: price.toString(),
        totalShares: 1000000,
        status: 'active'
      });

      await interaction.reply(`✅ 새 주식이 생성되었습니다!\n종목코드: ${symbol}\n회사명: ${name}\n초기가격: ₩${price.toLocaleString()}`);
      
      this.wsManager.broadcast('stock_created', stock);
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
      
      await interaction.reply(`${statusIcon} **${stock.name} (${symbol})**\n가격: ₩${Number(stock.price).toLocaleString()}\n상태: ${this.getStatusText(stock.status)}`);
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
}
