import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Save, Mail, Phone, MapPin, Calendar, Shield, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  bio: string;
  avatar?: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  joinDate: string;
  lastLogin: string;
}

export const ProfileModal = ({ open, onOpenChange }: ProfileModalProps) => {
  const [profile, setProfile] = useState<UserProfile>({
    name: "Usuário Demo",
    email: "demo@oxmaturador.com",
    phone: "+55 11 99999-9999",
    company: "OX Digital",
    location: "São Paulo, SP",
    bio: "Especialista em automação conversacional e marketing digital.",
    plan: 'Pro',
    joinDate: "2024-01-15",
    lastLogin: new Date().toISOString()
  });

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Carregar perfil do localStorage
      const savedProfile = localStorage.getItem('ox-user-profile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem('ox-user-profile', JSON.stringify(profile));
    toast({
      title: "Perfil atualizado",
      description: "Suas informações foram salvas com sucesso."
    });
    onOpenChange(false);
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'Enterprise':
        return <Crown className="w-4 h-4" />;
      case 'Pro':
        return <Shield className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Enterprise':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Pro':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Meu Perfil
          </DialogTitle>
          <DialogDescription>
            Gerencie suas informações pessoais e configurações da conta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header do Perfil */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{profile.name}</h3>
                    <Badge className={getPlanIcon && getPlanColor(profile.plan)}>
                      {getPlanIcon(profile.plan)}
                      <span className="ml-1">{profile.plan}</span>
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{profile.email}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Membro desde {new Date(profile.joinDate).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Atualize suas informações básicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={profile.company}
                    onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  placeholder="Conte um pouco sobre você e sua experiência..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas da Conta */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas da Conta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">3</div>
                  <div className="text-sm text-muted-foreground">Chips Criados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">256</div>
                  <div className="text-sm text-muted-foreground">Conversas Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">45</div>
                  <div className="text-sm text-muted-foreground">Dias Ativo</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Plano */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getPlanIcon(profile.plan)}
                Plano {profile.plan}
              </CardTitle>
              <CardDescription>
                {profile.plan === 'Free' && 'Plano gratuito com funcionalidades básicas'}
                {profile.plan === 'Pro' && 'Plano profissional com recursos avançados'}
                {profile.plan === 'Enterprise' && 'Plano empresarial com recursos completos'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Limite de Chips:</span>
                  <span className="text-sm font-medium">
                    {profile.plan === 'Free' ? '3' : profile.plan === 'Pro' ? '10' : 'Ilimitado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Conversas/mês:</span>
                  <span className="text-sm font-medium">
                    {profile.plan === 'Free' ? '1.000' : profile.plan === 'Pro' ? '10.000' : 'Ilimitado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Suporte:</span>
                  <span className="text-sm font-medium">
                    {profile.plan === 'Free' ? 'Comunidade' : profile.plan === 'Pro' ? 'E-mail' : 'Prioritário'}
                  </span>
                </div>
              </div>
              {profile.plan !== 'Enterprise' && (
                <Button className="w-full mt-4" variant="outline">
                  Fazer Upgrade
                </Button>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};