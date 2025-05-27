// ./components/ManagerInfo.tsx
// This component displays a list of managers with their images, nicknames, and Felo scores.
import { Manager } from "@/lib/types/";

const ManagerInfo: React.FC<{ managers: Manager[] }> = ({ managers }) => {
    return (
        <div className="space-y-2">
            {managers.map((manager, index) => (
                <div key={index} className="flex items-center space-x-2">
                    <img
                        src={manager.image_url || ''}
                        alt={manager.nickname || ''}
                        className="w-8 h-8 rounded-full"
                    />
                    <div>
                        <p className="font-semibold">{manager.nickname}</p>
                        <p className="text-sm text-gray-500">
                            {manager.felo_tier} (Score: {manager.felo_score})
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ManagerInfo;
