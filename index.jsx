const { Plugin } = require('powercord/entities');
const { inject, uninject } = require('powercord/injector');
const { React, getModule } = require('powercord/webpack');
const { get } = require('powercord/http');

/**
 * @type {Record<string, {flags: number}|undefined>}
 */
const applications = {};

module.exports = class BotDetails extends Plugin {
	async startPlugin() {
		const UserPopOutComponents = await getModule(['UserPopoutProfileText']);
		const Constants = await getModule(['Endpoints']);

		function Intents(applicationId, setIntents) {
			return async () => {
				if (typeof applications[applicationId]?.flags !== 'number') {
					applications[applicationId] = await get(
						`https://discord.com/api${Constants.Endpoints.APPLICATION_RPC(applicationId)}`
					)
						.catch((e) => (console.error(e), e))
						.then((res) => {
							if (res.statusCode === 200) {
								return res.body;
							}

							applications[applicationId] = null;
							return { flags: null };
						});
				}

				setIntents(applications[applicationId].flags ?? null);
			};
		}

		inject(
			'bot-details-popout-render',
			UserPopOutComponents,
			'UserPopoutProfileText',
			function ([{ displayProfile, user }], res) {
				if (!user.bot) return res;

				const applicationId = displayProfile._userProfile.application.id;

				const [intents, setIntents] = React.useState(null);
				React.useEffect(Intents(applicationId, setIntents), [applicationId]);

				res.props.children.push(
					React.createElement(
						'div',
						{ className: 'userInfoSection-3her-v' },
						React.createElement(
							'h3',
							{
								className: 'eyebrow-Ejf06y defaultColor-HXu-5n userInfoTitle-39qq0Y',
								style: { color: 'var(--header-secondary)' }
							},
							'Intents'
						),
						React.createElement(
							'div',
							{
								className: 'userInfoBody-1zgAd0 markup-eYLPri clamped-2ZePhX'
							},

							getIntents(intents)
						)
					)
				);

				return res;
			}
		);
	}

	pluginWillUnload() {
		uninject('bot-details-popout-render');
	}
};

const ApplicationFlags = {
	GATEWAY_PRESENCE: 1 << 12,
	GATEWAY_PRESENCE_LIMITED: 1 << 13,
	GATEWAY_GUILD_MEMBERS: 1 << 14,
	GATEWAY_GUILD_MEMBERS_LIMITED: 1 << 15,
	GATEWAY_MESSAGE_CONTENT: 1 << 18,
	GATEWAY_MESSAGE_CONTENT_LIMITED: 1 << 19
};

/**
 * @param {string} id
 * @param {string} name
 * @param {boolean} animated
 */
const emoji = (id, name, animated = false) => (
	<img
		src={'https://cdn.discordapp.com/emojis/' + id + (animated ? '.gif' : '.webp') + '?size=56&amp;quality=lossless'}
		alt={name}
		draggable="false"
		class="emoji"
	/>
);

const enabledEmoji = emoji('901935981832310845', ':enabled:');
const limitedEmoji = emoji('901936012110995506', ':limited:');
const disabledEmoji = emoji('901936024945565827', ':disabled:');
const loading = emoji('853419254619963392', ':loading:', true);

/**
 * @param {number|null} flags
 */
function getIntents(flags) {
	if (flags == null)
		return (
			<>
				<div>{loading} Presence</div>
				<div>{loading} Guild Members</div>
				<div>{loading} Message Content</div>
			</>
		);

	return (
		<>
			<div>{intentsEmoji('GATEWAY_PRESENCE', 'GATEWAY_PRESENCE_LIMITED')} Presence</div>
			<div>{intentsEmoji('GATEWAY_GUILD_MEMBERS', 'GATEWAY_GUILD_MEMBERS_LIMITED')} Guild Members</div>
			<div>{intentsEmoji('GATEWAY_MESSAGE_CONTENT', 'GATEWAY_MESSAGE_CONTENT_LIMITED')} Message Content</div>
		</>
	);

	/**
	 * @param {keyof typeof ApplicationFlags} full
	 * @param {keyof typeof ApplicationFlags} limited
	 */
	function intentsEmoji(full, limited) {
		if (flags & ApplicationFlags[full]) return enabledEmoji;
		if (flags & ApplicationFlags[limited]) return limitedEmoji;
		return disabledEmoji;
	}
}
