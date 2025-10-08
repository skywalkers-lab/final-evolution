import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";

interface User {
  id: string;
  discordId: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

interface AuthContextType {
  user: User | null;
  guilds: Guild[];
  selectedGuildId: string | null;
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
  selectGuild: (guildId: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check for existing session on mount
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/me", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Fetch guilds after user is authenticated
        const guildsResponse = await fetch("/api/guilds", {
          credentials: "include",
        });
        
        if (guildsResponse.ok) {
          const guildsData = await guildsResponse.json();
          setGuilds(guildsData);
          
          // Auto-select first guild if available
          if (guildsData.length > 0 && !selectedGuildId) {
            setSelectedGuildId(guildsData[0].id);
          }
        }
      } else {
        // For demo purposes, set default guild when not authenticated
        setUser(null);
        setGuilds([]);
        if (!selectedGuildId) {
          setSelectedGuildId('1284053249057620018');
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
      setGuilds([]);
      setSelectedGuildId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    window.location.href = "/auth/discord";
  };

  const logout = async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    setUser(null);
    setGuilds([]);
    setSelectedGuildId(null);
    setLocation("/login");
  };

  const selectGuild = (guildId: string) => {
    setSelectedGuildId(guildId);
  };


  return (
    <AuthContext.Provider value={{ 
      user, 
      guilds, 
      selectedGuildId, 
      isAdmin,
      login, 
      logout, 
      selectGuild, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
