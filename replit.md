# Overview

This is a Discord-based economy bot application with a full-stack web dashboard for managing a virtual economic system. The application provides features like virtual banking, stock trading, auction systems, news analysis, and tax collection. It's built as a comprehensive economic simulation tool for Discord servers, allowing users to trade virtual stocks, participate in auctions, and manage their virtual finances.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React with TypeScript**: The client-side application uses React 18 with TypeScript for type safety
- **Vite Build System**: Fast development server and optimized production builds
- **Wouter Router**: Lightweight routing solution for client-side navigation
- **shadcn/ui Components**: Modern UI component library built on Radix UI primitives
- **TailwindCSS**: Utility-first CSS framework with custom Discord-themed color palette
- **TanStack Query**: Server state management and caching for API data
- **Real-time WebSocket Integration**: Live updates for trading, auctions, and market data

## Backend Architecture
- **Express.js Server**: Node.js web server handling HTTP requests and WebSocket connections
- **TypeScript**: Type-safe server-side development
- **Modular Service Architecture**: Separate services for trading, auctions, tax collection, news analysis, and Discord bot integration
- **RESTful API Design**: Clean API endpoints organized by feature domain
- **Session-based Authentication**: Simple token-based authentication for admin access

## Database & ORM
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL
- **Drizzle ORM**: Type-safe database operations with schema validation
- **Database Schema**: Comprehensive schema covering users, accounts, transactions, stocks, auctions, and audit logs
- **Migration Support**: Database versioning through Drizzle Kit

## Real-time Features
- **WebSocket Manager**: Custom WebSocket service for real-time communication
- **Live Price Updates**: Real-time stock price simulation and broadcasting
- **Auction Bidding**: Live auction updates and bid notifications
- **Trading Notifications**: Instant trade execution and portfolio updates

## Service Layer
- **Trading Engine**: Handles stock buy/sell operations, portfolio management, and price simulation
- **Auction Manager**: Manages auction creation, bidding, and settlement processes
- **Tax Scheduler**: Automated monthly tax collection using cron jobs
- **News Analyzer**: Natural language processing for market sentiment analysis
- **Discord Bot Integration**: Full Discord slash command integration for all economy features

## Authentication & Security
- **Admin-only Access**: Web dashboard restricted to administrators with guild-specific passwords
- **Role-based Permissions**: Discord role integration for admin and employer privileges
- **Input Validation**: Comprehensive validation using Zod schemas
- **Audit Logging**: Complete transaction and administrative action logging

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **discord.js**: Discord bot API integration for slash commands and guild management
- **drizzle-orm**: Type-safe ORM for database operations
- **express**: Web server framework
- **ws**: WebSocket implementation for real-time features

## Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/**: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight React routing
- **react-hook-form**: Form state management with validation

## Development & Build Tools
- **vite**: Fast build tool and development server
- **typescript**: Type safety across the entire stack
- **drizzle-kit**: Database schema management and migrations
- **node-cron**: Scheduled task execution for tax collection

## Authentication & Validation
- **bcrypt**: Password hashing for admin authentication
- **zod**: Runtime type validation and schema definition
- **@hookform/resolvers**: Form validation integration

## Real-time & Communication
- **WebSocket Server**: Built-in WebSocket support for live updates
- **connect-pg-simple**: PostgreSQL session store integration
- **date-fns**: Date manipulation and formatting utilities