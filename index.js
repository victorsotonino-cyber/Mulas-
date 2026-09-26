const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '!';

// Mapa simple para manejar el estado AFK de los usuarios
const afkUsers = new Map();

client.once('ready', () => {
    console.log(`¡Bot conectado con éxito como ${client.user.tag}!`);
    client.user.setActivity('Protegiendo la Gang', { type: 3 }); // Tipo Watching
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // --- Sistema AFK (Detector de menciones a usuarios ausentes) ---
    if (afkUsers.has(message.author.id)) {
        afkUsers.delete(message.author.id);
        message.reply('👋 ¡Bienvenido de vuelta! Te he quitado el estado AFK.').then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
    }

    message.mentions.users.forEach(user => {
        if (afkUsers.has(user.id)) {
            message.reply(`⚠️ El usuario **{user.username}** está AFK. Motivo: *{afkUsers.get(user.id)}*`);
        }
    });

    // Validar prefijo
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ==========================================
    // 🛡️ SECCIÓN: MODERACIÓN
    // ==========================================

    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ No tienes permisos para banear usuarios.');
        }
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return message.reply('⚠️ Debes mencionar a un usuario válido.');
        
        const razon = args.slice(1).join(' ') || 'Sin razón especificada';
        try {
            await member.ban({ reason: razon });
            message.channel.send(`✅ Usuario **{member.user.tag}** baneado correctamente. Razón: ${razon}`);
        } catch (error) {
            message.reply('❌ No pude banear al usuario. Revisa que mi rol esté por encima del suyo.');
        }
    }

    else if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ No tienes permisos para expulsar usuarios.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('⚠️ Debes mencionar a un usuario para expulsar.');

        try {
            await member.kick();
            message.channel.send(`✅ **{member.user.tag}** ha sido expulsado del servidor.`);
        } catch (error) {
            message.reply('❌ No pude expulsar al usuario.');
        }
    }

    else if (command === 'clear') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ No tienes permisos para borrar mensajes.');
        }
        const cantidad = parseInt(args[0]);
        if (!cantidad || cantidad < 1 || cantidad > 100) {
            return message.reply('⚠️ Debes indicar un número de mensajes entre 1 y 100.');
        }
        try {
            await message.channel.bulkDelete(cantidad, true);
            const msg = await message.channel.send(`🧹 Se han borrado **{cantidad}** mensajes.`);
            setTimeout(() => msg.delete().catch(() => {}), 4000);
        } catch (error) {
            message.reply('❌ Error al borrar mensajes (recuerda que no pueden tener más de 14 días de antigüedad).');
        }
    }

    // ==========================================
    // ⚙️ SECCIÓN: UTILIDAD Y GENERALES
    // ==========================================

    else if (command === 'say') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ No tienes permisos para usar este comando.');
        }
        const texto = args.join(' ');
        if (!texto) return message.reply('⚠️ Escribe un texto para que el bot lo repita.');
        
        message.delete().catch(() => {});
        message.channel.send(texto);
    }

    else if (command === 'afk') {
        const motivo = args.join(' ') || 'Sin motivo especificado';
        afkUsers.set(message.author.id, motivo);
        message.reply(`💤 Te has puesto en estado AFK. Motivo: *{motivo}*`);
    }

    else if (command === 'ping') {
        const msg = await message.reply('Calculando ping...');
        const latencia = msg.createdTimestamp - message.createdTimestamp;
        msg.edit(`🏓 ¡Pong!\nLatencia del Bot: **{latencia}ms**\nLatencia de la API: **{Math.round(client.ws.ping)}ms**`);
    }

    else if (command === 'serverinfo') {
        const { guild } = message;
        const embed = new EmbedBuilder()
            .setColor('#2F3136')
            .setTitle(`📊 Información de ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '👑 Dueño', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 Miembros', value: `${guild.memberCount}`, inline: true },
                { name: '📅 Creación', value: `<t:{Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // ==========================================
    // 📜 COMANDO DE GUÍA / AYUDA
    // ==========================================

    else if (command === 'guia' || command === 'ayuda') {
        const embedGuia = new EmbedBuilder()
            .setColor('#2F3136')
            .setTitle('📜 GUÍA DE COMANDOS DE LA GANG')
            .setDescription('Lista de comandos operativos disponibles:')
            .addFields(
                { 
                    name: '🛡️ Moderación', 
                    value: '`!ban @usuario [razón]` - Banea a un usuario.\n`!kick @usuario [razón]` - Expulsa a un miembro.\n`!clear [1-100]` - Borra mensajes masivos.' 
                },
                { 
                    name: '⚙️ Utilidad', 
                    value: '`!say [mensaje]` - El bot repite tu texto.\n`!afk [motivo]` - Establece estado ausente.\n`!ping` - Muestra la latencia del bot.\n`!serverinfo` - Estadísticas del servidor.' 
                },
                { 
                    name: '🏢 Gestión Interna', 
                    value: '`!rango` / `!reclutar` / `!miembros` - Control interno de la banda.' 
                }
            )
            .setFooter({ text: 'Sistema Operativo de Gang' })
            .setTimestamp();

        message.channel.send({ embeds: [embedGuia] });
    }
});

// Iniciar sesión usando la variable de entorno de Railway
client.login(process.env.DISCORD_TOKEN);
      
