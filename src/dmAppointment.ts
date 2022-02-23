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

const ans_grammar: { [index: string]: { confirmation?: string, negation?: string } } = {

    "Yes.": { confirmation: "Yes" },
    "Yeah.": { confirmation: "Yes" },
    "Of course.": { confirmation: "Yes" },
    "Exactly.": { confirmation: "Yes" },
    "Yeah, exactly.": { confirmation: "Yes" },
    "No.": { negation: "No" },
    "Nope.": { negation: "No" },
    "No way.": { negation: "No" },
    "Not what I said.": { negation: "No" }
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
    states: {
        idle: {
            on: {
                CLICK: 'init'
            }
        },
        init: {
            on: {
                TTS_READY: 'askForName',
                CLICK: 'askForName'
            }
        },

        askForName: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'greet',
                        actions: assign({ username: (context) => context.recResult[0].utterance })
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("Hi, what's your name?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
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
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'purpose',
                        cond: (context) => "meeting" in (dec_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: 'celebrity',
                        cond: (context) => "celebrity" in (dec_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("Do you want to create a meeting or ask about somebody?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't understand that. Can you repeat?"),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },

        celebrity: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'confirmCeleb',
                        actions: assign({ celebrity: (context) => context.recResult[0].utterance })
                    },
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("Who do you want to know about?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
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
                        actions: assign({ title: (context) => `meeting with ${context.celebrity}` })
                    },
                    {
                        target: 'welcome',
                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.question'
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `${context.info}`
                    })),
                    on: { ENDSPEECH: 'question' }
                },
                question: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `Do you want to meet ${context.celebrity}?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't get it. Can you please repeat."),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },

        purpose: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'info',
                        cond: (context) => "title" in (grammar[context.recResult[0].utterance] || {}),
                        actions: assign({ title: (context) => grammar[context.recResult[0].utterance].title! })
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("What is it about?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I don't know what it is. Tell me something I know."),
                    on: { ENDSPEECH: 'ask' }
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
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'info2',
                        cond: (context) => "day" in (grammar[context.recResult[0].utterance] || {}),
                        actions: assign({ day: (context) => grammar[context.recResult[0].utterance].day! })
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("On which day is this meeting going to be?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I don't know what day it is. Could you repeat?"),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },

        time: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'info3',
                        cond: (context) => "time" in (grammar[context.recResult[0].utterance] || {}),
                        actions: assign({ time: (context) => grammar[context.recResult[0].utterance].time! })
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },
            states: {
                prompt: {
                    entry: say("What time is your meeting?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't hear what time it was supposed to be. Could you repeat?"),
                    on: { ENDSPEECH: 'ask' }
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
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'confirmAllDay',
                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: 'time',
                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },

            states: {
                prompt: {
                    entry: say("Will it take the whole day?"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't get it. Could you repeat?"),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },

        confirmAllDay: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'success',
                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: 'welcome',
                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },

            states: {
                prompt: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `${context.username}, do you want me to create a meeting titled ${context.title} for ${context.day} for the whole day?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't get it. Could you repeat?"),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },

        confirmTime: {
            initial: 'prompt',
            on: {
                RECOGNISED: [
                    {
                        target: 'success',
                        cond: (context) => "confirmation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: 'welcome',
                        cond: (context) => "negation" in (ans_grammar[context.recResult[0].utterance] || {}),
                    },
                    {
                        target: '.nomatch'
                    }
                ],
                TIMEOUT: '.prompt'
            },

            states: {
                prompt: {
                    entry: send((context) => ({
                        type: 'SPEAK',
                        value: `${context.username}, do you want me to create a meeting titled ${context.title} for ${context.day} at ${context.time}?`
                    })),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: send('LISTEN'),
                },
                nomatch: {
                    entry: say("Sorry, I didn't get it. Could you repeat?"),
                    on: { ENDSPEECH: 'ask' }
                }
            }
        },

        success: {
            entry: say(`Your meeting has been created!`),
            on: { ENDSPEECH: 'init' }  
        }
    }
})


