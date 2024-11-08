import { DiscordContextProvider } from "../hooks/useDiscordSdk.js";
import { Activity } from "./Activity.js";
import "./App.css";
/**
 * Set `authenticate` to true to enable Discord authentication.
 * You can also set the `scope` prop to request additional permissions.
 *
 * ```
 * <DiscordContextProvider authenticate scope={['identify', 'guilds']}>
 *  <Activity />
 * </DiscordContextProvider>
 * ```
 *
 * Learn more:
 * https://robojs.dev/discord-activities/authentication
 */ export default function App() {
    return /*#__PURE__*/ React.createElement(DiscordContextProvider, null, /*#__PURE__*/ React.createElement(Activity, null));
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkQ6XFxkaXNjXFxkZW1vMVxcc3JjXFxhcHBcXEFwcC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGlzY29yZENvbnRleHRQcm92aWRlciB9IGZyb20gJy4uL2hvb2tzL3VzZURpc2NvcmRTZGsnXG5pbXBvcnQgeyBBY3Rpdml0eSB9IGZyb20gJy4vQWN0aXZpdHknXG5pbXBvcnQgJy4vQXBwLmNzcydcblxuLyoqXG4gKiBTZXQgYGF1dGhlbnRpY2F0ZWAgdG8gdHJ1ZSB0byBlbmFibGUgRGlzY29yZCBhdXRoZW50aWNhdGlvbi5cbiAqIFlvdSBjYW4gYWxzbyBzZXQgdGhlIGBzY29wZWAgcHJvcCB0byByZXF1ZXN0IGFkZGl0aW9uYWwgcGVybWlzc2lvbnMuXG4gKlxuICogYGBgXG4gKiA8RGlzY29yZENvbnRleHRQcm92aWRlciBhdXRoZW50aWNhdGUgc2NvcGU9e1snaWRlbnRpZnknLCAnZ3VpbGRzJ119PlxuICogIDxBY3Rpdml0eSAvPlxuICogPC9EaXNjb3JkQ29udGV4dFByb3ZpZGVyPlxuICogYGBgXG4gKlxuICogTGVhcm4gbW9yZTpcbiAqIGh0dHBzOi8vcm9ib2pzLmRldi9kaXNjb3JkLWFjdGl2aXRpZXMvYXV0aGVudGljYXRpb25cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQXBwKCkge1xuXHRyZXR1cm4gKFxuXHRcdDxEaXNjb3JkQ29udGV4dFByb3ZpZGVyPlxuXHRcdFx0PEFjdGl2aXR5IC8+XG5cdFx0PC9EaXNjb3JkQ29udGV4dFByb3ZpZGVyPlxuXHQpXG59XG4iXSwibmFtZXMiOlsiRGlzY29yZENvbnRleHRQcm92aWRlciIsIkFjdGl2aXR5IiwiQXBwIl0sIm1hcHBpbmdzIjoiQUFBQSxTQUFTQSxzQkFBc0IsUUFBUSw0QkFBd0I7QUFDL0QsU0FBU0MsUUFBUSxRQUFRLGdCQUFZO0FBQ3JDLE9BQU8sWUFBVztBQUVsQjs7Ozs7Ozs7Ozs7O0NBWUMsR0FDRCxlQUFlLFNBQVNDO0lBQ3ZCLHFCQUNDLG9CQUFDRiw0Q0FDQSxvQkFBQ0M7QUFHSiJ9