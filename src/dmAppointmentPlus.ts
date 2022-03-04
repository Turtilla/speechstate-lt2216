import { MachineConfig, send, Action, assign } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}


const kbRequest = (text: string) =>
    fetch(new Request(`https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`)).then(data => data.json())

const grammar: { [index: string]: { title?: string, day?: string, time?: string } } = {
    "Lecture.": { title: "Dialogue systems lecture" },
    "Lunch.": { title: "Lunch at the canteen" },
    "Cinema.": { title: "A movie at the cinema" },
    "Walk.": { title: "A walk in the park" },
    "Date.": { title: "A romantic date at a great restaurant" },
    "Language course.": { title: "Swedish language course on zoom" },
    "Programming.": { title: "Programming the assignment with classmates" },
    "Video games.": { title: "Gaming with friends" },
    "Phone call.": { title: "A call with the family" },

    "On Monday.": { day: "Monday" },
    "On Tuesday.": { day: "Tuesday" },
    "On Wednesday.": { day: "Wednesday" },
    "On Thursday.": { day: "Thursday" },
    "On Friday.": { day: "Friday" },
    "On Saturday.": { day: "Saturday" },
    "On Sunday.": { day: "Sunday" },
    "Monday.": { day: "Monday" },
    "Tuesday.": { day: "Tuesday" },
    "Wednesday.": { day: "Wednesday" },
    "Thursday.": { day: "Thursday" },
    "Friday.": { day: "Friday" },
    "Saturday.": { day: "Saturday" },
    "Sunday.": { day: "Sunday" },
    "Monday": { day: "Monday" },
    "Tuesday": { day: "Tuesday" },
    "Wednesday": { day: "Wednesday" },
    "Thursday": { day: "Thursday" },
    "Friday": { day: "Friday" },
    "Saturday": { day: "Saturday" },
    "Sunday": { day: "Sunday" },
    "Today": { day: "today" },
    "Tomorrow.": { day: "tomorrow" },

    "Midday.": { time: "12:00" }, // this section is rather long due to having 12 possible hours and many ways of saying them (or them being written down)
    "At noon": { time: "12:00" },
    "10.": { time: "10:00" },
    "11.": { time: "11:00" },
    "12.": { time: "12:00" },
    "1.": { time: "1:00" },
    "2.": { time: "2:00" },
    "3.": { time: "3:00" },
    "4.": { time: "4:00" },
    "5.": { time: "5:00" },
    "6.": { time: "6:00" },
    "7.": { time: "7:00" },
    "8.": { time: "8:00" },
    "9.": { time: "9:00" },
    "10": { time: "10:00" },
    "11": { time: "11:00" },
    "12": { time: "12:00" },
    "1": { time: "1:00" },
    "2": { time: "2:00" },
    "3": { time: "3:00" },
    "4": { time: "4:00" },
    "5": { time: "5:00" },
    "6": { time: "6:00" },
    "7": { time: "7:00" },
    "8": { time: "8:00" },
    "9": { time: "9:00" },
    "At 10:00": { time: "10:00" },
    "At 11:00": { time: "11:00" },
    "At 12:00": { time: "12:00" },
    "At 1:00": { time: "1:00" },
    "At 2:00": { time: "2:00" },
    "At 3:00": { time: "3:00" },
    "At 4:00": { time: "4:00" },
    "At 5:00": { time: "5:00" },
    "At 6:00": { time: "6:00" },
    "At 7:00": { time: "7:00" },
    "At 8:00": { time: "8:00" },
    "At 9:00": { time: "9:00" },
    "At ten": { time: "10:00" },
    "At eleven": { time: "11:00" },
    "At twelve": { time: "12:00" },
    "At one": { time: "1:00" },
    "At two": { time: "2:00" },
    "At three": { time: "3:00" },
    "At four": { time: "4:00" },
    "At five": { time: "5:00" },
    "At six": { time: "6:00" },
    "At seven": { time: "7:00" },
    "At eight": { time: "8:00" },
    "At nine": { time: "9:00" },
    "At 10:00 o'clock.": { time: "10:00" },
    "At 11:00 o'clock.": { time: "11:00" },
    "At 12:00 o'clock.": { time: "12:00" },
    "At 1:00 o'clock.": { time: "1:00" },
    "At 2:00 o'clock.": { time: "2:00" },
    "At 3:00 o'clock.": { time: "3:00" },
    "At 4:00 o'clock.": { time: "4:00" },
    "At 5:00 o'clock.": { time: "5:00" },
    "At 6:00 o'clock.": { time: "6:00" },
    "At 7:00 o'clock.": { time: "7:00" },
    "At 8:00 o'clock.": { time: "8:00" },
    "At 9:00 o'clock.": { time: "9:00" },
    "10:00 o'clock.": { time: "10:00" },
    "11:00 o'clock.": { time: "11:00" },
    "12:00 o'clock.": { time: "12:00" },
    "1:00 o'clock.": { time: "1:00" },
    "2:00 o'clock.": { time: "2:00" },
    "3:00 o'clock.": { time: "3:00" },
    "4:00 o'clock.": { time: "4:00" },
    "5:00 o'clock.": { time: "5:00" },
    "6:00 o'clock.": { time: "6:00" },
    "7:00 o'clock.": { time: "7:00" },
    "8:00 o'clock.": { time: "8:00" },
    "9:00 o'clock.": { time: "9:00" },
    "10:00 o'clock": { time: "10:00" },
    "11:00 o'clock": { time: "11:00" },
    "12:00 o'clock": { time: "12:00" },
    "1:00 o'clock": { time: "1:00" },
    "2:00 o'clock": { time: "2:00" },
    "3:00 o'clock": { time: "3:00" },
    "4:00 o'clock": { time: "4:00" },
    "5:00 o'clock": { time: "5:00" },
    "6:00 o'clock": { time: "6:00" },
    "7:00 o'clock": { time: "7:00" },
    "8:00 o'clock": { time: "8:00" },
    "9:00 o'clock": { time: "9:00" },
}

const ans_grammar: { [index: string]: { confirmation?: string, negation?: string, help?: string } } = {

    "Yes.": { confirmation: "Yes" },
    "Yeah.": { confirmation: "Yes" },
    "Of course.": { confirmation: "Yes" },
    "Exactly.": { confirmation: "Yes" },
    "Yeah, exactly.": { confirmation: "Yes" },
    "No.": { negation: "No" },
    "Nope.": { negation: "No" },
    "No way.": { negation: "No" },
    "Not what I said.": { negation: "No" },
    "Help.": { help: "Help" },
    "Help me.": { help: "Help" },
    "I don't know what to do.": { help: "Help" },
    "I don't know what to say.": { help: "Help" }
}

const dec_grammar: { [index: string]: { meeting?: string, celebrity?: string } } = {

    "I want to create a meeting.": { meeting: "Yes" },
    "Create a meeting.": { meeting: "Yes" },
    "A meeting.": { meeting: "Yes" },
    "I want a meeting.": { meeting: "Yes" },
    "Meeting.": { meeting: "Yes" },
    "I want to ask about somebody.": { celebrity: "Yes" },
    "I want to ask about someone.": { celebrity: "Yes" },
    "Ask about somebody.": { celebrity: "Yes" },
    "Ask about someone.": { celebrity: "Yes" },
    "I want to ask.": { celebrity: "Yes" },
    "Somebody.": { celebrity: "Yes" },
    "Someone.": { celebrity: "Yes" },
    "Ask.": { celebrity: "Yes" },
}


export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'idle',
    entry: assign({ counter: (context) => 0 }),
    states: {
        idle: {
            on: {
                CLICK: 'init'
            }
        },

        init: {
            on: {
                TTS_READY: 'appointmentApp',
                CLICK: 'appointmentApp',
            }
        },

        getHelp: {
            initial: 'explain',
            states: {
                explain: {
                    entry: say(`Please make sure to speak slowly and clearly so that the system understands you.`),
                    on: { ENDSPEECH: '#root.dm.appointmentApp.hist' },
                }
            }
        },

        appointmentApp: {
            initial: 'askForName',
            states: {
                hist: {
                    type: 'history',
                },

                askForName: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {})
                            },
                            {
                                target: 'greet',
                                cond: (context) => context.recResult[0].confidence > 0.6,
                                actions: [assign({ username: (context) => context.recResult[0].utterance }), assign({ counter: (context) => 0 })]
                            },
                            {
                                target: '.makeSureName',
                                cond: (context) => context.recResult[0].confidence <= 0.6,
                                actions: [assign({ uncertain: (context) => context.recResult[0].utterance })]
                            }
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter+1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                                always: [
                                    { target: 'prompt1', cond: (context) => context.counter === 0 },
                                    { target: 'prompt2', cond: (context) => context.counter === 1 },
                                    { target: 'prompt3', cond: (context) => context.counter === 2 },
                                    { target: '#root.dm.idle', cond: (context) => context.counter === 3 },
                                ]
                        },
                        prompt1: {
                            entry: say("What's your name?"),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt2: {
                            entry: say("What should I call you?"),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        prompt3: {
                            entry: say("Please tell me your name."),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        makeSureName: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '#root.dm.appointmentApp.greet',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }), assign({ username: (context) => context.uncertain }),]
                                    },
                                    {
                                        target: '#root.dm.appointmentApp.askForName',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '#root.dm.getHelp',
                                        cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Did you mean ${context.uncertain}?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                            

                        }
                    }
                },

                greet: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `Welcome, ${context.username}.`
                    })),
                    on: { ENDSPEECH: 'welcome' }
                },

                welcome: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '.makeSureMeeting',
                                cond: (context) => "meeting" in (dec_grammar[context.recResult[0].utterance] || {}),
                                actions: [assign({ uncertain: (context) => context.recResult[0].utterance })]
                            },
                            {
                                target: '.makeSureCelebrity',
                                cond: (context) => "celebrity" in (dec_grammar[context.recResult[0].utterance] || {}),
                                actions: [assign({ uncertain: (context) => context.recResult[0].utterance })]
                            },
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 })
                            }
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: '#root.dm.idle', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: say("Do you want to create a meeting or ask about somebody?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: say("Would you prefer to create a new meeting or ask about a celebrity?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt3: {
                            entry: say("Please tell me if you want to make a meeting or ask about a famous person."),
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I didn't understand that."),
                            on: { ENDSPEECH: 'choose' }
                        },
                        makeSureMeeting: {
                            initial: 'choose',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '#root.dm.appointmentApp.purpose',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }),]
                                    },
                                    {
                                        target: '#root.dm.appointmentApp.welcome',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '#root.dm.getHelp',
                                        cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                choose: {
                                    always: [
                                        { target: '#root.dm.appointmentApp.purpose', cond: (context) => context.recResult[0].confidence > 0.6, },
                                        { target: 'makeSure', cond: (context) => context.recResult[0].confidence <= 0.6, },
                                    ]
                                },
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Did you mean ${context.uncertain}?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },
                            },
                        },
                        makeSureCelebrity: {
                            initial: 'choose',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '#root.dm.appointmentApp.celebrity',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }), assign({ username: (context) => context.uncertain }),]
                                    },
                                    {
                                        target: '#root.dm.appointmentApp.welcome',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '#root.dm.getHelp',
                                        cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                choose: {
                                    always: [
                                        { target: '#root.dm.appointmentApp.celebrity', cond: (context) => context.recResult[0].confidence > 0.6, },
                                        { target: 'makeSure', cond: (context) => context.recResult[0].confidence <= 0.6, },
                                    ]
                                },
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Did you mean ${context.uncertain}?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },
                            },
                        }
                    },

                },
                celebrity: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: 'confirmCeleb',
                                cond: (context) => context.recResult[0].confidence > 0.6,
                                actions: [assign({ celebrity: (context) => context.recResult[0].utterance }), assign({ counter: (context) => 0 })]
                            },
                            {
                                target: '.makeSureCeleb',
                                cond: (context) => context.recResult[0].confidence <= 0.6,
                                actions: [assign({ uncertain: (context) => context.recResult[0].utterance })]
                            }
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: '#root.dm.idle', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: say("Who do you want to know about?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: say("What celebrity would you like to hear about?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt3: {
                            entry: say("Please tell me the name of the person you want me to tell you about."),
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        makeSureCeleb: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '#root.dm.appointmentApp.confirmCeleb',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }), assign({ celebrity: (context) => context.uncertain }),]
                                    },
                                    {
                                        target: '#root.dm.appointmentApp.celebrity',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '#root.dm.getHelp',
                                        cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Did you mean ${context.uncertain}?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        }
                    }
                },

                confirmCeleb: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `OK, looking for information about ${context.celebrity}`
                    })),
                    on: { ENDSPEECH: 'getCeleb' }
                },

                getCeleb: {
                    invoke: {
                        id: 'getInfo',
                        src: (context, event) => kbRequest(context.celebrity),
                        onDone: {
                            target: 'celebMeeting',
                            actions: [
                                assign({ info: (context, event) => event.data.AbstractText }),
                                (context, event) => console.log(context, event)
                            ]
                        },
                        onError: {
                            target: 'celebrity'
                        }
                    }
                },

                celebMeeting: {
                    initial: 'prompt',
                    on: {
                        RECOGNISED: [
                            {
                                target: 'date',
                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: [assign({ title: (context) => `meeting with ${context.celebrity}` }), assign({ counter: (context) => 0 }),]
                            },
                            {
                                target: 'welcome',
                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: assign({ counter: (context) => 0 }),
                            },
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 }),
                            }
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        prompt: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `${context.info}`
                            })),
                            on: { ENDSPEECH: 'choose' }
                        },
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: '#root.dm.idle', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Do you want to meet ${context.celebrity}?`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Would you like to meet ${context.celebrity}?`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt3: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Should I schedule you a meeting with ${context.celebrity}?`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I didn't get it."),
                            on: { ENDSPEECH: 'choose' }
                        }
                    }
                },

                purpose: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: 'info',
                                cond: (context) => "title" in (grammar[context.recResult[0].utterance] || {}) && context.recResult[0].confidence > 0.6,
                                actions: [assign({ title: (context) => grammar[context.recResult[0].utterance].title! }), assign({ counter: (context) => 0 }),]
                            },
                            {
                                target: '.makeSurePurpose',
                                cond: (context) => "title" in (grammar[context.recResult[0].utterance] || {}) && context.recResult[0].confidence <= 0.6,
                                actions: [assign({ uncertain: (context) => context.recResult[0].utterance })]
                            },
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 }),
                            }
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: '#root.dm.idle', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: say("What is it about?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: say("What is your meeting about?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt3: {
                            entry: say("Please tell me the purpose of your meeting."),
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I don't know what it is. Tell me something I know."),
                            on: { ENDSPEECH: 'choose' }
                        },
                        makeSurePurpose: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '#root.dm.appointmentApp.info',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }), assign({ title: (context) => grammar[context.uncertain].title! }),]
                                    },
                                    {
                                        target: '#root.dm.appointmentApp.purpose',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '#root.dm.getHelp',
                                        cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Did you mean ${context.uncertain}?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },


                        }
                    }
                },

                info: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `OK, ${context.title}`
                    })),
                    on: { ENDSPEECH: 'date' }
                },

                date: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: 'info2',
                                cond: (context) => "day" in (grammar[context.recResult[0].utterance] || {}) && context.recResult[0].confidence > 0.6,
                                actions: [assign({ day: (context) => grammar[context.recResult[0].utterance].day! }), assign({ counter: (context) => 0 })]
                            },
                            {
                                target: '.makeSureDay',
                                cond: (context) => "day" in (grammar[context.recResult[0].utterance] || {}) && context.recResult[0].confidence <= 0.6,
                                actions: [assign({ uncertain: (context) => context.recResult[0].utterance })]
                            },
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 }),
                            }
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: '#root.dm.idle', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: say("On which day is this meeting going to be?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: say("What is the day of your meeting?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt3: {
                            entry: say("Please tell me what day you plan this meeting for."),
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I did not understand what you said."),
                            on: { ENDSPEECH: 'choose' }
                        },
                        makeSureDay: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '#root.dm.appointmentApp.info2',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }), assign({ day: (context) => grammar[context.uncertain].day! }),]
                                    },
                                    {
                                        target: '#root.dm.appointmentApp.date',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '#root.dm.getHelp',
                                        cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Did you mean ${context.uncertain}?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        }
                    }
                },

                time: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: 'info3',
                                cond: (context) => "time" in (grammar[context.recResult[0].utterance] || {}) && context.recResult[0].confidence > 0.6,
                                actions: [assign({ time: (context) => grammar[context.recResult[0].utterance].time! }), assign({ counter: (context) => 0 })]
                            },
                            {
                                target: '.makeSureTime',
                                cond: (context) => "time" in (grammar[context.recResult[0].utterance] || {}) && context.recResult[0].confidence <= 0.6,
                                actions: [assign({ uncertain: (context) => context.recResult[0].utterance })]
                            },
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 }),
                            }
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },
                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: '#root.dm.idle', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: say("What time is your meeting?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: say("At what time will your meeting take place?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt3: {
                            entry: say("Please tell me the hour to schedule your meeting for."),
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I didn't hear what time it was supposed to be."),
                            on: { ENDSPEECH: 'choose' }
                        },
                        makeSureTime: {
                            initial: 'makeSure',
                            on: {
                                RECOGNISED: [
                                    {
                                        target: '#root.dm.appointmentApp.info3',
                                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                        actions: [assign({ counter: (context) => 0 }), assign({ time: (context) => grammar[context.uncertain].time! }),]
                                    },
                                    {
                                        target: '#root.dm.appointmentApp.time',
                                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '#root.dm.getHelp',
                                        cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                                    },
                                    {
                                        target: '.nomatch',
                                    }
                                ],
                                TIMEOUT: { target: '.makeSure' }
                            },
                            states: {
                                makeSure: {
                                    entry: send((context) => ({
                                        type: 'SPEAK',
                                        value: `Did you mean ${context.uncertain}?`
                                    })),
                                    on: {
                                        ENDSPEECH: 'ask'
                                    }
                                },
                                ask: {
                                    entry: send('LISTEN'),
                                },
                                nomatch: {
                                    entry: say("Sorry, I did not get that."),
                                    on: { ENDSPEECH: 'makeSure' }
                                },

                            },
                        }
                    }
                },

                info2: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `OK, ${context.day}`
                    })),
                    on: { ENDSPEECH: 'allDay' }
                },

                info3: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `OK, ${context.time}`
                    })),
                    on: { ENDSPEECH: 'confirmTime' }
                },

                allDay: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: 'confirmAllDay',
                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: 'time',
                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 }),
                            }
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },

                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: '#root.dm.idle', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: say("Will it take the whole day?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: say("Will your meeting take the whole day?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt3: {
                            entry: say("Are you planning to spend your whole day on this meeting?"),
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I didn't get it."),
                            on: { ENDSPEECH: 'choose' }
                        }
                    }
                },

                confirmAllDay: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: 'success',
                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: 'welcome',
                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 }),
                            }
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },

                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: '#root.dm.idle', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `${context.username}, do you want me to create a meeting titled ${context.title} for ${context.day} for the whole day?`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Dear ${context.username}, should I create a meeting titled ${context.title} for ${context.day} for the whole day?`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt3: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `${context.username}, shall I schedule you a meeting titled ${context.title} for ${context.day} for the whole day?`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I didn't get it."),
                            on: { ENDSPEECH: 'choose' }
                        }
                    }
                },

                confirmTime: {
                    initial: 'choose',
                    on: {
                        RECOGNISED: [
                            {
                                target: 'success',
                                cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: 'welcome',
                                cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                                actions: assign({ counter: (context) => 0 })
                            },
                            {
                                target: '#root.dm.getHelp',
                                cond: (context) => "help" in (ans_grammar[context.recResult[0].utterance] || {}),
                            },
                            {
                                target: '.nomatch',
                                actions: assign({ counter: (context) => context.counter + 1 }),
                            }
                        ],
                        TIMEOUT: { actions: assign({ counter: (context) => context.counter + 1 }), target: '.choose' }
                    },

                    states: {
                        choose: {
                            always: [
                                { target: 'prompt1', cond: (context) => context.counter === 0 },
                                { target: 'prompt2', cond: (context) => context.counter === 1 },
                                { target: 'prompt3', cond: (context) => context.counter === 2 },
                                { target: '#root.dm.idle', cond: (context) => context.counter === 3 },
                            ]
                        },
                        prompt1: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `${context.username}, do you want me to create a meeting titled ${context.title} for ${context.day} at ${context.time}`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt2: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `Dear ${context.username}, should I create a meeting titled ${context.title} for ${context.day} at ${context.time}`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        prompt3: {
                            entry: send((context) => ({
                                type: 'SPEAK',
                                value: `${context.username}, shall I schedule you a meeting titled ${context.title} for ${context.day} at ${context.time}`
                            })),
                            on: { ENDSPEECH: 'ask' }
                        },
                        ask: {
                            entry: send('LISTEN'),
                        },
                        nomatch: {
                            entry: say("Sorry, I didn't get it."),
                            on: { ENDSPEECH: 'choose' }
                        }
                    }
                },

                success: {
                    entry: say(`Your meeting has been created!`),
                    on: { ENDSPEECH: '#root.dm.init' }
                },
            }
        },


    }
})


